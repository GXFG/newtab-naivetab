/**
 * 全局快捷键 Port 连接（newtab 页面专用）—— 书签 + 命令统一处理
 *
 * Content Script 不会注入扩展页面（chrome-extension://），
 * 所以 newtab 页面需要通过 addKeydownTask 注册自己的快捷键处理，
 * 通过共享 Port 将按键事件发送到 Service Worker 统一处理。
 *
 * 共享 Port 机制：
 * - 书签快捷键与命令快捷键共用同一个 Port（name='naivetab-shortcut'）
 * - 避免两个独立 Port 连接到 SW 时，SW 的 portMap[tabId] 被后连接的覆盖
 * - 共享 Port 在 shortcut-utils.ts 的 getSharedPort() 中管理
 *
 * 冲突处理：
 * 单一 handler 内同时匹配书签和命令，冲突时命令优先（与 Content Script 对齐）。
 * 详见 docs/architecture/messaging.md
 */
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import {
  matchShortcut,
  isSwReady,
  toModifierMask,
  getSharedPort,
} from '@/logic/globalShortcut/shortcut-utils'
import {
  localConfig,
  localState,
  globalState,
  switchSettingDrawerVisible,
} from '@/logic/store'
import { toggleIsDragMode } from '@/logic/moveable'
import { getCommandExecEnv } from '@/logic/globalShortcut/shortcut-command'
import { MSG_KEYDOWN, MSG_EXECUTE_COMMAND } from '@/types/messages'

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
    window.$message?.info(label)
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
 * scrollUp / scrollDown / scrollToTop / scrollToBottom 未在此实现，
 * 因为 newtab 页面无滚动内容，被 setupPortCommandListener 静默忽略。
 */
const newtabCommandExecutors: Record<string, () => void> = {
  reloadPage: () => location.reload(),
  copyPageUrl: () => {
    navigator.clipboard
      .writeText(location.href)
      .then(() => {
        window.$message.success(window.$t('keyboardCommand.toast.copyPageUrl'))
      })
      .catch(() => {})
  },
  copyPageTitle: () => {
    navigator.clipboard
      .writeText(document.title)
      .then(() => {
        window.$message.success(
          window.$t('keyboardCommand.toast.copyPageTitle'),
        )
      })
      .catch(() => {})
  },
}

/**
 * 注册共享 Port 的 CS 命令回传监听（newtab 端）
 */
const setupPortCommandListener = () => {
  const port = getSharedPort()
  port.onMessage.addListener((msg: { type: string; command: string }) => {
    if (msg.type === MSG_EXECUTE_COMMAND) {
      const executor = newtabCommandExecutors[msg.command]
      if (executor) {
        executor()
      }
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

  if (!bookmarkCode && !commandCode) return

  // 修饰键冲突检测：同修饰键掩码 或 同时开启无修饰键模式 → 命令优先
  const bmMask = toModifierMask(keyboardBookmark.globalShortcutModifiers)
  const cmdMask = toModifierMask(keyboardCommand.modifiers)
  const hasModifierConflict =
    bookmarkCode &&
    commandCode &&
    ((bmMask === cmdMask &&
      !keyboardBookmark.noModifierMode &&
      !keyboardCommand.noModifierMode) ||
      (keyboardBookmark.noModifierMode && keyboardCommand.noModifierMode))

  // 命令快捷键：先处理 newtab 本地命令（直接执行，不走 SW）
  if (commandCode) {
    const entry = keyboardCommand.keymap?.[commandCode]
    if (entry?.command) {
      const execEnv = getCommandExecEnv(entry.command)
      if (execEnv === 'newtab') {
        const executor = newtabControlExecutors[entry.command]
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
  const needSendToSw = bookmarkCode || commandCode
  if (needSendToSw && !isSwReady()) {
    window.$message?.warning(window.$t('common.swInitializing'))
    return false
  }

  // 通过共享 Port 发送按键事件到 SW
  let sent = false
  try {
    const port = getSharedPort()
    // 命令优先：冲突时只发命令，书签被跳过
    if (commandCode) {
      port.postMessage({
        type: MSG_KEYDOWN,
        key: commandCode,
        source: 'command',
      })
      sent = true
    }
    if (bookmarkCode && !hasModifierConflict) {
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
