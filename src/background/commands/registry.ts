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

import { log } from '@/logic/utils/common'
import { MAX_LAYERS } from '@/common/widget-constants'
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
  moveWindowToNextDisplay,
  mergeAllWindows,
  groupCurrentTab,
  ungroupCurrentTab,
  toggleGroupCollapse,
  closeGroupTabs,
  lastUsedTab,
  goBack,
  goForward,
  goHome,
} from './handlers'
import type { TSwCommandName } from '@/logic/shortcut/shortcut-command'
import { buildAndSaveLayerKeymap } from './layer-keymap-builder'
import {
  getCachedKeyboardBookmarkLayers,
  markLayerKeymapBuilding,
} from '../config/cache'
import { sendLayerSwitchToast } from '../messaging/toast'
import { ACTIVE_LAYER_STORAGE_KEY } from '@/logic/keyboard/keyboard-constants'

/**
 * 单命令 handler 签名。
 *
 * 部分 handler 是 async（如 closeWindow），返回 void | Promise<void>。
 * execSwCommand 统一捕获未处理的 Promise 拒绝，避免异常泄漏到全局。
 */
type CommandHandler = (tabId: number) => void | Promise<void>

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

const moveWindowToNextDisplayCmd = async (tabId: number) => {
  await moveWindowToNextDisplay(tabId)
}

const newWindow = (_tabId: number) => {
  chrome.windows.create().catch(logLastError)
}

const newIncognito = (_tabId: number) => {
  chrome.windows.create({ incognito: true }).catch(logLastError)
}

// ─── 会话与去重 ──────────────────────────────────────────────────────────

const reopenClosedTab = (_tabId: number) => {
  // 不传参数时 restore() 自动恢复最近关闭的 session（tab 或 window）
  // 无需先调用 getRecentlyClosed，避免 sessionId 类型不在 @types/chrome 中的问题
  chrome.sessions.restore().catch(logLastError)
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

// ─── 书签层切换 ─────────────────────────────────────────────────────────

/**
 * 书签层切换命令 handler 工厂。
 *
 * 为什么需要先调用 markLayerKeymapBuilding()：
 * buildAndSaveLayerKeymap() 是 async，内部 await parseBookmarkFolder() 会读取
 * chrome.bookmarks 树（可能数百 ms）。在此期间如果用户按下书签快捷键，
 * 会读到旧的 cachedSystemKeymap（onChanged 尚未触发）。
 * markLayerKeymapBuilding() 在命令触发时立即设置标志位，
 * 确保整个异步期间书签快捷键被正确拦截。
 */
const switchBookmarkLayer = (layerIndex: number) => async (_tabId: number) => {
  markLayerKeymapBuilding()
  await buildAndSaveLayerKeymap(layerIndex)
  sendLayerSwitchToast(layerIndex)
}

/**
 * 在配置了 sourceFolderPath 的层之间循环切换。
 *
 * 行为说明：
 * - 只遍历已配置 sourceFolderPath 的层（未配置的层被跳过）
 * - 循环路径为已配置层的顺序（如配了层 0 和层 2，则 0 → 2 → 0 → 2）
 * - 只配置了 1 个层时静默跳过（没有其他层可切）
 */
const cycleBookmarkLayers = async (_tabId: number) => {
  const layers = getCachedKeyboardBookmarkLayers()
  const configured: number[] = []
  for (let i = 0; i < layers.length; i++) {
    if (layers[i]?.sourceFolderPath) configured.push(i)
  }
  if (configured.length <= 1) return

  const result = await chrome.storage.local.get(ACTIVE_LAYER_STORAGE_KEY)
  const current =
    typeof result[ACTIVE_LAYER_STORAGE_KEY] === 'number'
      ? result[ACTIVE_LAYER_STORAGE_KEY]
      : 0
  const pos = configured.indexOf(current)
  const next = configured[(pos + 1) % configured.length]

  markLayerKeymapBuilding()
  await buildAndSaveLayerKeymap(next)
  sendLayerSwitchToast(next)
}

// ─── 命令注册表 ──────────────────────────────────────────────────────────

/**
 * 动态生成 switchBookmarkLayer1-N 命令名称。
 * 如 MAX_LAYERS=4，生成 ['switchBookmarkLayer1', 'switchBookmarkLayer2', ...]
 */
const SWITCH_BOOKMARK_LAYER_COMMANDS = Array.from(
  { length: MAX_LAYERS },
  (_, i) => `switchBookmarkLayer${i + 1}` as const,
)

type TSwitchBookmarkLayerCommand =
  (typeof SWITCH_BOOKMARK_LAYER_COMMANDS)[number]

/** 动态生成的 switchBookmarkLayer handlers 对象 */
const SWITCH_BOOKMARK_LAYER_HANDLERS = Object.fromEntries(
  Array.from({ length: MAX_LAYERS }, (_, i) => [
    `switchBookmarkLayer${i + 1}`,
    switchBookmarkLayer(i),
  ]),
) as Record<TSwitchBookmarkLayerCommand, CommandHandler>

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
  moveWindowToNextDisplay: moveWindowToNextDisplayCmd,
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

  // 书签层切换
  ...SWITCH_BOOKMARK_LAYER_HANDLERS,
  cycleBookmarkLayers,
}

/**
 * SW 命令分发器
 *
 * 统一捕获 async handler 的未处理 Promise 拒绝，避免异常泄漏。
 * sync handler 的异常由调用方的 try/catch 或全局 unhandledrejection 处理。
 */
export const execSwCommand = (command: TSwCommandName, tabId: number) => {
  try {
    const result = COMMAND_HANDLERS[command](tabId)
    if (result instanceof Promise) {
      result.catch(logLastError)
    }
  } catch (e) {
    logLastError(e as Error)
  }
}
