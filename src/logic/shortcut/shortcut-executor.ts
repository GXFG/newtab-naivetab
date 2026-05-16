/**
 * @module shortcut/shortcut-executor
 * @description 全局快捷键 Port 连接（newtab 页面专用）—— 书签 + 命令统一处理。
 *   Content Script 不会注入扩展页面，所以 newtab 页面通过 addKeydownTask 注册按键处理，
 *   通过共享 Port 发送到 Service Worker。包含 newtabControlExecutors（newtab 内部控制命令）
 *   和 newtabCommandExecutors（CS 命令回传执行器）。
 *   冲突处理：单一 handler 内同时匹配书签和命令，冲突时命令优先（与 CS 端对齐）。
 *   Port 消息监听还处理层切换 toast（MSG_SWITCH_BOOKMARK_LAYER），统一由 SW 下发。
 * @dependencies shortcut/port.ts（getSharedPort/isSwReady）、shortcut/matcher.ts（matchShortcut）、
 *   shortcut/shortcut-command.ts（COMMAND_SHORTCUT_CODE）、logic/task（addKeydownTask）
 * @consumers newtab/App.vue
 * @see docs/features/global-shortcut.md
 * @see docs/architecture/messaging.md
 */
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { toModifierMask } from '@/logic/shortcut/utils'
import { matchShortcut } from '@/logic/shortcut/matcher'
import { isSwReady, getSharedPort } from '@/logic/shortcut/port'
import { localConfig, localState } from '@/logic/config/state'
import { globalState, switchSettingDrawerVisible } from '@/logic/store/state'
import { toggleIsDragMode } from '@/logic/moveable'
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
  },
  toggleDragMode: () => {
    switchSettingDrawerVisible(false)
    toggleIsDragMode()
  },
  toggleSettingDrawer: () => {
    switchSettingDrawerVisible(!globalState.isSettingDrawerVisible)
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
 * newtab 页面全局快捷键统一 keydown 处理
 *
 * 同时匹配书签和命令快捷键，冲突时命令优先（与 Content Script 对齐）。
 * newtab 本地命令（execEnv: 'newtab'）直接执行，不走 SW。
 */
const globalShortcutTask = (e: KeyboardEvent) => {
  const keyboardBookmark = localConfig.keyboardBookmark
  const keyboardCommand = localConfig.keyboardCommand

  // 分别匹配书签和命令快捷键
  const bookmarkCode = matchShortcut(
    e,
    keyboardBookmark.isGlobalShortcutEnabled,
    keyboardBookmark.globalShortcutModifiers,
    keyboardBookmark.shortcutInInputElement,
    keyboardBookmark.urlBlacklist,
    location.hostname,
    keyboardBookmark.noModifierMode,
  )
  const commandCode = matchShortcut(
    e,
    keyboardCommand.isEnabled,
    keyboardCommand.modifiers,
    keyboardCommand.shortcutInInputElement,
    keyboardCommand.urlBlacklist,
    location.hostname,
    keyboardCommand.noModifierMode,
  )

  // 无修饰键模式下 matchShortcut 对 ALLOWED_SET 中所有键都返回 code，
  // 但 keymap 中可能没有实际绑定。先检查是否真正存在绑定，
  // 避免拦截页面原生的按键行为（如视频站点的方向键控制进度）。
  const hasCommandBinding =
    commandCode && keyboardCommand.keymap?.[commandCode]?.command
  const hasBookmarkBinding =
    bookmarkCode && localConfig.keyboardBookmark.keymap?.[bookmarkCode]?.url

  if (!hasCommandBinding && !hasBookmarkBinding) return

  // 修饰键冲突检测：同修饰键掩码 或 同时开启无修饰键模式 → 命令优先
  const bmMask = toModifierMask(keyboardBookmark.globalShortcutModifiers)
  const cmdMask = toModifierMask(keyboardCommand.modifiers)
  const hasModifierConflict =
    hasBookmarkBinding &&
    hasCommandBinding &&
    ((bmMask === cmdMask &&
      !keyboardBookmark.noModifierMode &&
      !keyboardCommand.noModifierMode) ||
      (keyboardBookmark.noModifierMode && keyboardCommand.noModifierMode))

  // 命令快捷键：先处理 newtab 本地命令（直接执行，不走 SW）
  if (hasCommandBinding) {
    const entry = keyboardCommand.keymap?.[commandCode]
    if (entry?.command) {
      const execEnv = getCommandExecEnv(entry.command as TCommandName)
      if (execEnv === 'newtab') {
        const executor = newtabControlExecutors[entry.command as TCommandName]
        if (executor) {
          executor()
          e.preventDefault()
          e.stopPropagation()
          return true
        }
      }
    }
  }

  // SW 就绪检查：有需要发送到 SW 的消息时才检查
  if ((hasCommandBinding || hasBookmarkBinding) && !isSwReady()) {
    showToast.warning(window.$t('common.swInitializing'))
    return false
  }

  // 通过共享 Port 发送按键事件到 SW
  let sent = false
  try {
    const port = getSharedPort()
    // 命令优先：冲突时只发命令，书签被跳过
    if (hasCommandBinding) {
      port.postMessage({
        type: MSG_KEYDOWN,
        key: commandCode,
        source: 'command',
      })
      sent = true
    }
    if (hasBookmarkBinding && !hasModifierConflict) {
      port.postMessage({
        type: MSG_KEYDOWN,
        key: bookmarkCode,
        source: 'bookmark',
      })
      sent = true
    }
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
 * 在 newtab 中启用全局快捷键监听（书签 + 命令统一处理）
 */
export const setupNewtabGlobalShortcut = () => {
  addKeydownTask('globalShortcut', globalShortcutTask)
  setupPortCommandListener()
}

/**
 * 在 newtab 中移除全局快捷键监听
 *
 * 注意：浏览器新标签页关闭时不会触发 Vue onUnmounted，整个 JS 环境直接销毁，
 * 此函数在实际运行中几乎不会被调用。仅在开发 HMR / 扩展热重载时生效。
 * 属于防御性清理代码，无害。
 */
export const cleanupNewtabGlobalShortcut = () => {
  removeKeydownTask('globalShortcut')
}
