/**
 * @module shortcut/shortcut-executor
 * @description 命令快捷键 Port 连接（newtab 页面专用）。
 *   Content Script 不会注入扩展页面，所以 newtab 页面通过 addKeydownTask 注册按键处理，
 *   通过共享 Port 发送到 Service Worker。
 *   - newtabControlExecutors：newtab 内部控制命令（toggleFocusMode/dragMode/settingDrawer），直接本地执行
 *   - newtabCommandExecutors：CS 命令回传执行器（reloadPage/copyPageUrl/copyPageTitle），Port 回传后执行
 *   书签由 keyboardBookmark Widget 的 keyboardTask 独立处理，通过 TaskPriority（命令 0，书签 10）保证命令优先。
 *   Port 消息监听还处理层切换 toast（MSG_SWITCH_BOOKMARK_LAYER），统一由 SW 下发。
 * @dependencies shortcut/port.ts（getSharedPort/isSwReady）、shortcut/matcher.ts（matchShortcut）、
 *   shortcut/shortcut-command.ts（COMMAND_SHORTCUT_CODE）、logic/task（addKeydownTask）
 * @consumers newtab/App.vue
 * @see docs/features/global-shortcut.md
 * @see docs/architecture/messaging.md
 */
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { matchShortcut } from '@/logic/shortcut/matcher'
import { isSwReady, getSharedPort } from '@/logic/shortcut/port'
import { localConfig, localState } from '@/logic/config/state'
import { globalState, switchSettingDrawerVisible } from '@/logic/store/state'
import { gaProxy } from '@/logic/utils/gtag'
import { toggleDragMode } from '@/logic/moveable'
import {
  getCommandExecEnv,
  type TCommandName,
} from '@/logic/shortcut/shortcut-command'
import { showToast } from '@/common/toast'
import {
  MSG_KEYDOWN,
  MSG_EXECUTE_COMMAND,
  MSG_SWITCH_BOOKMARK_LAYER,
  type SwToCsMessage,
} from '@/types/messages'

/**
 * NaiveTab 本地控制命令执行器（execEnv: 'newtab'）
 * 直接操作 localConfig / globalState，不经过 SW。
 */
const newtabControlExecutors: Record<string, () => void> = {
  toggleFocusMode: () => {
    const next = !localState.value.isFocusMode
    localState.value.isFocusMode = next
    const label = next
      ? window.$t('rightMenu.focusMode')
      : `${window.$t('common.exit')} ${window.$t('rightMenu.focusMode')}`
    showToast.info(label)
    gaProxy('click', ['focusMode_toggle'], {
      enabled: next,
      source: 'shortcut',
    })
  },
  toggleDragMode: () => {
    switchSettingDrawerVisible(false)
    toggleDragMode()
  },
  toggleSettingDrawer: () => {
    const next = !globalState.isSettingDrawerVisible
    switchSettingDrawerVisible(next)
    if (next) {
      gaProxy('click', ['setting', 'open'], { trigger: 'shortcut' })
    }
  },
}

/**
 * newtab 端 CS 命令执行器
 * scroll 系列命令未在此实现，因为 newtab 页面无滚动内容。
 * 新增 scroll 命令在此静默忽略。
 */
const newtabCommandExecutors: Record<string, () => void> = {
  reloadPage: () => location.reload(),
  copyPageUrl: () => {
    navigator.clipboard
      .writeText(location.href)
      .then(() => {
        showToast.success(window.$t('keyboardCommand.toast.copyPageUrl'))
      })
      .catch(() => {})
  },
  copyPageTitle: () => {
    navigator.clipboard
      .writeText(document.title)
      .then(() => {
        showToast.success(window.$t('keyboardCommand.toast.copyPageTitle'))
      })
      .catch(() => {})
  },
  scrollPageUp: () => {},
  scrollPageDown: () => {},
  scrollLeft: () => {},
  scrollRight: () => {},
  scrollToLeft: () => {},
  scrollToRight: () => {},
}

/**
 * 注册共享 Port 的 CS 命令回传监听（newtab 端）
 */
const setupPortCommandListener = () => {
  const port = getSharedPort()
  port.onMessage.addListener((msg: SwToCsMessage) => {
    if (msg.type === MSG_EXECUTE_COMMAND) {
      const executor = newtabCommandExecutors[msg.command]
      if (executor) {
        executor()
      }
    } else if (msg.type === MSG_SWITCH_BOOKMARK_LAYER) {
      showToast.info(
        window
          .$t('keyboardCommand.toast.switchToLayer')
          .replace('__n__', msg.folderName),
      )
    }
  })
}

/**
 * newtab 页面命令快捷键 keydown 处理。
 *
 * 仅匹配命令快捷键。书签由 keyboardTask 独立处理，
 * 两者通过 TaskPriority 实现命令优先（命令 0 > 书签 10）。
 */
const globalShortcutTask = (e: KeyboardEvent) => {
  const keyboardCommand = localConfig.keyboardCommand

  // 匹配命令快捷键
  const commandCode = matchShortcut(
    e,
    keyboardCommand.isEnabled,
    keyboardCommand.modifiers,
    keyboardCommand.shortcutInInputElement,
    keyboardCommand.urlBlacklist,
    location.hostname,
    keyboardCommand.noModifierMode,
  )

  const hasCommandBinding =
    commandCode && keyboardCommand.keymap?.[commandCode]?.command
  if (!hasCommandBinding) return false

  // newtab 本地命令（execEnv: 'newtab'）直接执行，不走 SW
  if (hasCommandBinding) {
    const entry = keyboardCommand.keymap[commandCode]
    if (entry?.command) {
      const execEnv = getCommandExecEnv(entry.command as TCommandName)
      if (execEnv === 'newtab') {
        // newtab 本地命令：SW 不会收到消息，由 newtab 端上报 press
        gaProxy('press', ['command'], {
          key_code: commandCode,
          command_code: entry.command,
        })
        const executor = newtabControlExecutors[entry.command as TCommandName]
        if (executor) {
          executor()
          e.preventDefault()
          e.stopPropagation()
          return true
        }
        // executor 不存在说明 execEnv 声明与实际实现不一致，
        // fall through 到 SW 路径（SW 可能也不认识该命令，但不会崩溃）。
      }
    }
  }

  // SW 就绪检查：isSwReady 反映"Port 是否已连接且收到过 INIT_COMPLETE"。
  //
  // newtab 端只有 Port 一条路径，不使用 sendMessage 降级。原因：
  // 1. Port 断连后 scheduleReconnect 使用指数退避（100ms~1000ms）自动重连，窗口期极短
  // 2. connect() 调用本身就会唤醒休眠的 SW
  // 3. 用户打开 newtab 页面时会立即建立 Port 连接，实际场景中 Port 断开的窗口期几乎不存在
  // 4. toast 提示比静默等待 50-200ms 更直接
  // CS 端使用 sendMessage 降级是因为注入到第三方网页，容错要求更高。
  if (!isSwReady()) {
    showToast.warning(window.$t('common.swInitializing'))
    return false
  }

  // 通过共享 Port 发送命令到 SW
  let sent = false
  try {
    const port = getSharedPort()
    port.postMessage({
      type: MSG_KEYDOWN,
      key: commandCode,
      source: 'command',
    })
    sent = true
  } catch {
    return false
  }

  if (sent) {
    e.preventDefault()
    e.stopPropagation()
    return true
  }
  return false
}

/**
 * 在 newtab 中启用命令快捷键监听
 */
export const setupNewtabCommandShortcut = () => {
  addKeydownTask('globalShortcut', globalShortcutTask, 0)
  setupPortCommandListener()
}

/**
 * 在 newtab 中移除命令快捷键监听
 *
 * 注意：浏览器新标签页关闭时不会触发 Vue onUnmounted，整个 JS 环境直接销毁，
 * 此函数在实际运行中几乎不会被调用。仅在开发 HMR / 扩展热重载时生效。
 * 属于防御性清理代码，无害。
 */
export const cleanupNewtabCommandShortcut = () => {
  removeKeydownTask('globalShortcut')
}
