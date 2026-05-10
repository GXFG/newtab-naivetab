/**
 * SW 命令注册表
 *
 * 每个命令定义为独立的命名函数，通过 Record 映射做 O(1) 分发。
 * 相比 switch 的优势：
 * - 函数名即命令名，grep 定位更快
 * - 新命令只需添加一个函数 + 一条注册项，不膨胀主文件
 * - 按功能分组，视觉结构清晰
 * - TS Record 约束确保不会遗漏命令（缺少属性编译报错）
 */

import { log } from '@/logic/util'
import {
  switchTab,
  switchToEdgeTab,
  switchToPinnedTab,
  closeTabsAround,
  closeDuplicateTabs,
  reloadAllTabs,
  reloadAllTabsAllWindows,
  moveTab,
  moveToNewWindow,
  moveTabToNextWindow,
  mergeAllWindows,
  groupCurrentTab,
  ungroupCurrentTab,
  toggleGroupCollapse,
  closeGroupTabs,
  lastUsedTab,
  goBack,
  goForward,
  goHome,
} from './commands'
import type { TSwCommandName } from '@/logic/globalShortcut/shortcut-command'

/**
 * 单命令 handler 签名
 */
type CommandHandler = (tabId: number) => void

// ─── 工具函数 ────────────────────────────────────────────────────────────

const logLastError = (e: Error) => {
  log('Chrome API error:', e)
}

// ─── Tab 操作 ────────────────────────────────────────────────────────────

const toggleTabPinned = (tabId: number) => {
  chrome.tabs
    .get(tabId)
    .then((tab) => {
      chrome.tabs.update(tabId, { pinned: !tab.pinned }).catch(logLastError)
    })
    .catch(logLastError)
}

const toggleTabMute = (tabId: number) => {
  chrome.tabs
    .get(tabId)
    .then((tab) => {
      chrome.tabs
        .update(tabId, { muted: !tab.mutedInfo?.muted })
        .catch(logLastError)
    })
    .catch(logLastError)
}

const duplicateTab = (tabId: number) => {
  chrome.tabs.duplicate(tabId).catch(logLastError)
}

const closeTab = (tabId: number) => {
  chrome.tabs.remove(tabId).catch(logLastError)
}

const closeOtherTabs = (tabId: number) => {
  closeTabsAround(tabId, 'others')
}

const closeLeftTabs = (tabId: number) => {
  closeTabsAround(tabId, 'left')
}

const closeRightTabs = (tabId: number) => {
  closeTabsAround(tabId, 'right')
}

const nextTab = (tabId: number) => {
  switchTab(tabId, 1)
}

const prevTab = (tabId: number) => {
  switchTab(tabId, -1)
}

const firstTab = (tabId: number) => {
  switchToEdgeTab(tabId, 'first')
}

const lastTab = (tabId: number) => {
  switchToEdgeTab(tabId, 'last')
}

const switchToPinnedTab1 = (tabId: number) => switchToPinnedTab(tabId, 0)
const switchToPinnedTab2 = (tabId: number) => switchToPinnedTab(tabId, 1)
const switchToPinnedTab3 = (tabId: number) => switchToPinnedTab(tabId, 2)
const switchToPinnedTab4 = (tabId: number) => switchToPinnedTab(tabId, 3)
const switchToPinnedTab5 = (tabId: number) => switchToPinnedTab(tabId, 4)
const switchToPinnedTab6 = (tabId: number) => switchToPinnedTab(tabId, 5)
const switchToPinnedTab7 = (tabId: number) => switchToPinnedTab(tabId, 6)
const switchToPinnedTab8 = (tabId: number) => switchToPinnedTab(tabId, 7)
const switchToPinnedTab9 = (tabId: number) => switchToPinnedTab(tabId, 8)
const switchToPinnedTabLast = (tabId: number) => switchToPinnedTab(tabId, -1)

const reloadAllTabsCmd = (tabId: number) => {
  reloadAllTabs(tabId)
}

const reloadAllTabsAllWindowsCmd = (tabId: number) => {
  reloadAllTabsAllWindows(tabId)
}

const newTab = (_tabId: number) => {
  chrome.tabs.create({ index: undefined }).catch(logLastError)
}

const newTabAfter = (tabId: number) => {
  chrome.tabs
    .get(tabId)
    .then((tab) => {
      chrome.tabs
        .create({ index: (tab.index ?? 0) + 1, active: true })
        .catch(logLastError)
    })
    .catch(logLastError)
}

// ─── 窗口操作 ────────────────────────────────────────────────────────────

const closeWindow = async (tabId: number) => {
  const tab = await chrome.tabs.get(tabId).catch(logLastError)
  if (!tab?.windowId) return
  const windows = await chrome.windows.getAll().catch(logLastError)
  if (!windows) return
  const sameTypeWindows = windows.filter(
    (w) => w.type === 'normal' && w.incognito === tab.incognito,
  )
  if (sameTypeWindows.length <= 1) return
  await chrome.windows.remove(tab.windowId).catch(logLastError)
}

const moveTabLeft = (tabId: number) => {
  moveTab(tabId, -1)
}

const moveTabRight = (tabId: number) => {
  moveTab(tabId, 1)
}

const moveToNewWindowCmd = (tabId: number) => {
  moveToNewWindow(tabId)
}

const moveTabToNextWindowCmd = (tabId: number) => {
  moveTabToNextWindow(tabId)
}

const newWindow = (_tabId: number) => {
  chrome.windows.create().catch(logLastError)
}

const newIncognito = (_tabId: number) => {
  chrome.windows.create({ incognito: true }).catch(logLastError)
}

// ─── 会话与去重 ──────────────────────────────────────────────────────────

const reopenClosedTab = (_tabId: number) => {
  chrome.sessions
    .getRecentlyClosed({ maxResults: 1 })
    .then((sessions) => {
      if (sessions.length > 0) {
        const sessionId = (sessions[0] as any).sessionId as string | undefined
        if (sessionId) {
          chrome.sessions.restore(sessionId).catch(logLastError)
        }
      }
    })
    .catch(logLastError)
}

const closeDuplicateTabsCmd = (tabId: number) => {
  closeDuplicateTabs(tabId)
}

const mergeAllWindowsCmd = (tabId: number) => {
  mergeAllWindows(tabId)
}

// ─── 标签组 ──────────────────────────────────────────────────────────────

const groupCurrentTabCmd = (tabId: number) => {
  groupCurrentTab(tabId)
}

const ungroupCurrentTabCmd = (tabId: number) => {
  ungroupCurrentTab(tabId)
}

const toggleGroupCollapseCmd = (tabId: number) => {
  toggleGroupCollapse(tabId)
}

const closeGroupTabsCmd = (tabId: number) => {
  closeGroupTabs(tabId)
}

const lastUsedTabCmd = (tabId: number) => {
  lastUsedTab(tabId)
}

// ─── 命令注册表 ──────────────────────────────────────────────────────────

/**
 * 命令名称 → handler 映射。
 * key 必须与 TSwCommandName 完全一致，TS 会在类型推导中自动检查遗漏。
 */
const COMMAND_HANDLERS: Record<TSwCommandName, CommandHandler> = {
  // Tab 操作
  toggleTabPinned,
  toggleTabMute,
  duplicateTab,
  closeTab,
  closeOtherTabs,
  closeLeftTabs,
  closeRightTabs,
  nextTab,
  prevTab,
  firstTab,
  lastTab,
  switchToPinnedTab1,
  switchToPinnedTab2,
  switchToPinnedTab3,
  switchToPinnedTab4,
  switchToPinnedTab5,
  switchToPinnedTab6,
  switchToPinnedTab7,
  switchToPinnedTab8,
  switchToPinnedTab9,
  switchToPinnedTabLast,
  reloadAllTabs: reloadAllTabsCmd,
  reloadAllTabsAllWindows: reloadAllTabsAllWindowsCmd,
  newTab,
  newTabAfter,
  goBack,
  goForward,
  goHome,

  // 窗口操作
  closeWindow,
  moveTabLeft,
  moveTabRight,
  moveToNewWindow: moveToNewWindowCmd,
  moveTabToNextWindow: moveTabToNextWindowCmd,
  newWindow,
  newIncognito,

  // 会话与去重
  reopenClosedTab,
  closeDuplicateTabs: closeDuplicateTabsCmd,
  mergeAllWindows: mergeAllWindowsCmd,

  // 标签组
  groupCurrentTab: groupCurrentTabCmd,
  ungroupCurrentTab: ungroupCurrentTabCmd,
  toggleGroupCollapse: toggleGroupCollapseCmd,
  closeGroupTabs: closeGroupTabsCmd,

  // 最近标签页
  lastUsedTab: lastUsedTabCmd,
}

/**
 * SW 命令分发器
 */
export const execSwCommand = (command: TSwCommandName, tabId: number) => {
  COMMAND_HANDLERS[command](tabId)
}
