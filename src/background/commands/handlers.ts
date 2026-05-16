/**
 * Background 命令执行模块
 *
 * 所有 SW 端直接执行的命令函数。
 * 仅使用 Chrome Extension API，不涉及 DOM 操作。
 */
import { log } from '@/logic/utils/common'

/**
 * 记录 Chrome API 调用失败（静默处理，不向用户暴露）
 */
const logLastError = (e: Error) => {
  log('Chrome API error:', e)
}

/**
 * 最近使用的标签页历史（维护最多 2 个 tabId）。
 * 供 lastUsedTab 命令和 chrome.tabs.onActivated 监听器使用。
 */
let recentTabHistory: number[] = []

/**
 * 记录标签页激活事件，维护最近两个 tabId。
 * 应在 main.ts 的 chrome.tabs.onActivated 监听器中调用。
 */
export const registerRecentTab = (tabId: number) => {
  recentTabHistory = recentTabHistory.filter((id) => id !== tabId)
  recentTabHistory.unshift(tabId)
  if (recentTabHistory.length > 2) recentTabHistory.pop()
}

/**
 * 在最近使用的两个标签页间切换（类似 Alt+Tab）。
 */
export const lastUsedTab = async (currentTabId: number) => {
  registerRecentTab(currentTabId)
  const targetId = recentTabHistory[1]
  if (!targetId || targetId === currentTabId) return
  chrome.tabs.update(targetId, { active: true }).catch(logLastError)
}

// ── 页面导航 ──────────────────────────────────────────────────────────────

export const goBack = async (tabId: number) => {
  chrome.tabs.goBack(tabId).catch(logLastError)
}

export const goForward = async (tabId: number) => {
  chrome.tabs.goForward(tabId).catch(logLastError)
}

export const goHome = async (_tabId: number) => {
  chrome.tabs.update({ url: 'chrome://newtab' }).catch(logLastError)
}

// ── 标签页切换 ──────────────────────────────────────────────────────────────

export const switchTab = async (currentTabId: number, offset: 1 | -1) => {
  const tab = await chrome.tabs.get(currentTabId).catch(logLastError)
  if (!tab?.windowId) return

  const tabs = await chrome.tabs.query({ windowId: tab.windowId })
  if (tabs.length <= 1) return

  const currentIndex = tabs.findIndex((t) => t.id === currentTabId)
  if (currentIndex < 0) return

  const targetIndex = (currentIndex + offset + tabs.length) % tabs.length
  chrome.tabs
    .update(tabs[targetIndex].id!, { active: true })
    .catch(logLastError)
}

export const switchToEdgeTab = async (
  currentTabId: number,
  edge: 'first' | 'last',
) => {
  const tab = await chrome.tabs.get(currentTabId).catch(logLastError)
  if (!tab?.windowId) return

  const tabs = await chrome.tabs
    .query({ windowId: tab.windowId })
    .then((ts) => ts.filter((t) => !t.pinned))
  if (tabs.length <= 1) return

  const target = edge === 'first' ? tabs[0] : tabs[tabs.length - 1]
  chrome.tabs.update(target.id!, { active: true }).catch(logLastError)
}

/**
 * 切换到指定位置的 pinned tab。
 * @param index 0-based 索引；负数表示倒数（-1 = 最后一个 pinned tab）
 */
export const switchToPinnedTab = async (
  currentTabId: number,
  index: number,
) => {
  const tab = await chrome.tabs.get(currentTabId).catch(logLastError)
  if (!tab?.windowId) return

  const pinnedTabs = await chrome.tabs
    .query({ windowId: tab.windowId, pinned: true })
    .catch(logLastError)
  if (!pinnedTabs || pinnedTabs.length === 0) return

  const targetIndex = index >= 0 ? index : pinnedTabs.length + index
  if (targetIndex < 0 || targetIndex >= pinnedTabs.length) return

  const target = pinnedTabs[targetIndex]
  if (target?.id) {
    chrome.tabs.update(target.id, { active: true }).catch(logLastError)
  }
}

// ── 标签页关闭 ──────────────────────────────────────────────────────────────

export const closeTabsAround = async (
  currentTabId: number,
  mode: 'others' | 'left' | 'right',
) => {
  const tab = await chrome.tabs.get(currentTabId)
  if (!tab.windowId || !tab.index) return

  const tabs = await chrome.tabs.query({ windowId: tab.windowId })
  const toRemove = tabs
    .filter((t) => t.id !== currentTabId && !t.pinned)
    .filter((t) => {
      if (mode === 'others') return true
      if (mode === 'left')
        return t.index !== undefined && t.index < (tab.index ?? 0)
      return t.index !== undefined && t.index > (tab.index ?? 0)
    })
    .map((t) => t.id) as number[]

  if (toRemove.length > 0) {
    chrome.tabs.remove(toRemove).catch(logLastError)
  }
}

export const closeDuplicateTabs = async (currentTabId: number) => {
  const tab = await chrome.tabs.get(currentTabId).catch(logLastError)
  if (!tab?.windowId) return

  const tabs = await chrome.tabs.query({ windowId: tab.windowId })
  const urlMap = new Map<string, number[]>()

  for (const t of tabs) {
    if (!t.id || !t.url || t.pinned) continue
    if (!t.url.startsWith('http')) continue
    const existing = urlMap.get(t.url) || []
    existing.push(t.id)
    urlMap.set(t.url, existing)
  }

  const toRemove: number[] = []
  for (const ids of urlMap.values()) {
    if (ids.length > 1) {
      toRemove.push(...ids.slice(1))
    }
  }

  if (toRemove.length > 0) {
    chrome.tabs.remove(toRemove).catch(logLastError)
  }
}

// ── 标签页操作 ──────────────────────────────────────────────────────────────

const reloadTabs = async (windowId: number | undefined) => {
  const tabs = await chrome.tabs.query(windowId != null ? { windowId } : {})
  const reloadPromises = tabs
    .filter((t) => t.id && t.url?.startsWith('http'))
    .map((t) => chrome.tabs.reload(t.id!).catch(logLastError))

  if (reloadPromises.length > 0) {
    Promise.allSettled(reloadPromises).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        log(
          'reloadTabs: some tabs failed to reload',
          failed.length,
          'of',
          reloadPromises.length,
        )
      }
    })
  }
}

export const reloadAllTabs = async (currentTabId: number) => {
  const tab = await chrome.tabs.get(currentTabId).catch(logLastError)
  if (!tab?.windowId) return
  await reloadTabs(tab.windowId)
}

export const reloadAllTabsAllWindows = async (_currentTabId: number) => {
  await reloadTabs(undefined)
}

export const moveTab = async (currentTabId: number, offset: 1 | -1) => {
  const tab = await chrome.tabs.get(currentTabId).catch(logLastError)
  if (!tab?.windowId || tab.index === undefined) return

  const tabs = await chrome.tabs.query({ windowId: tab.windowId })
  const currentIndex = tabs.findIndex((t) => t.id === currentTabId)
  if (currentIndex < 0) return

  const targetIndex = currentIndex + offset
  if (targetIndex < 0 || targetIndex >= tabs.length) return

  chrome.tabs
    .move(currentTabId, { index: tabs[targetIndex].index })
    .catch(logLastError)
}

// ── 窗口操作 ────────────────────────────────────────────────────────────────

export const moveToNewWindow = async (tabId: number) => {
  chrome.windows.create({ tabId }).catch(logLastError)
}

export const moveTabToNextWindow = async (tabId: number) => {
  const currentTab = await chrome.tabs.get(tabId).catch(() => null)
  if (!currentTab?.windowId) return

  const windows = await chrome.windows.getAll().catch(() => [])
  const otherWindows = windows.filter(
    (w) => w.id !== currentTab.windowId && w.type === 'normal',
  )

  // 仅一个窗口时，创建新窗口并将 tab 移入
  if (otherWindows.length === 0) return moveToNewWindow(tabId)

  const currentIndex = windows.findIndex(
    (w) => w.id === currentTab.windowId && w.type === 'normal',
  )
  let targetWindow = otherWindows[0]
  if (currentIndex >= 0) {
    for (let i = 1; i <= windows.length; i++) {
      const candidate = windows[(currentIndex + i) % windows.length]
      if (candidate.id !== currentTab.windowId && candidate.type === 'normal') {
        targetWindow = candidate
        break
      }
    }
  }

  chrome.tabs
    .move(tabId, { windowId: targetWindow.id!, index: -1 })
    .then(() => {
      chrome.tabs.update(tabId, { active: true }).catch(logLastError)
      chrome.windows
        .update(targetWindow.id!, { focused: true })
        .catch(logLastError)
    })
    .catch(logLastError)
}

/**
 * 将当前窗口移动到下一个显示器。
 *
 * 实现原理：通过 chrome.windows.update 直接设置窗口坐标。
 * 注意：最大化/全屏窗口会忽略 left/top，必须先设为 normal 状态。
 * 仅一个显示器时静默跳过。
 */
export const moveWindowToNextDisplay = async (tabId: number) => {
  const currentTab = await chrome.tabs.get(tabId).catch(() => null)
  if (!currentTab?.windowId) return

  const displays = await chrome.system.display.getInfo().catch(() => [])
  if (displays.length <= 1) return

  // 获取当前窗口信息
  const currentWindow = await chrome.windows
    .get(currentTab.windowId)
    .catch(() => null)
  if (!currentWindow) return

  const { left: winLeft, top: winTop } = currentWindow
  let currentDisplayIndex = -1

  for (let i = 0; i < displays.length; i++) {
    const bounds = displays[i].bounds
    if (
      winLeft! >= bounds.left &&
      winLeft! < bounds.left + bounds.width &&
      winTop! >= bounds.top &&
      winTop! < bounds.top + bounds.height
    ) {
      currentDisplayIndex = i
      break
    }
  }

  if (currentDisplayIndex < 0) currentDisplayIndex = 0

  // 循环到下一个显示器
  const targetDisplay = displays[(currentDisplayIndex + 1) % displays.length]
  const { left, top, width, height } = targetDisplay.bounds

  // 先设为 normal 状态（最大化/全屏窗口会忽略 left/top）
  await chrome.windows.update(currentTab.windowId, { state: 'normal' })

  // 再设置目标显示器的位置和尺寸
  await chrome.windows.update(currentTab.windowId, {
    left,
    top,
    width,
    height,
  })

  // 聚焦窗口
  chrome.windows
    .update(currentTab.windowId, { focused: true })
    .catch(logLastError)
}

export const mergeAllWindows = async (_currentTabId: number) => {
  const windows = await chrome.windows
    .getAll({ populate: true })
    .catch(() => [])
  const normalWindows = windows.filter(
    (w) => w.type === 'normal' && w.tabs && w.tabs.length > 0,
  )

  if (normalWindows.length <= 1) return

  const [targetWindow, ...others] = normalWindows
  const targetId = targetWindow.id!

  for (const win of others) {
    if (!win.tabs) continue
    const tabIds = win.tabs.map((t) => t.id!).filter(Boolean)
    if (tabIds.length === 0) continue

    await chrome.tabs
      .move(tabIds, { windowId: targetId, index: -1 })
      .catch(logLastError)
    await chrome.windows.remove(win.id!).catch(logLastError)
  }

  await chrome.windows.update(targetId, { focused: true }).catch(logLastError)
}

// ── 标签组操作 ──────────────────────────────────────────────────────────────

/**
 * 将当前标签页加入新组（若已在组中则加入组内下一个标签页所属的组）
 */
export const groupCurrentTab = async (tabId: number) => {
  const tab = await chrome.tabs.get(tabId).catch(logLastError)
  if (!tab) return

  // 已在组中：尝试加入同窗口内另一个组
  if (tab.groupId !== -1) {
    const tabs = await chrome.tabs.query({ windowId: tab.windowId })
    const otherGroupTabs = tabs.filter(
      (t) => t.groupId !== -1 && t.groupId !== tab.groupId,
    )
    if (otherGroupTabs.length > 0) {
      const targetGroupId = otherGroupTabs[0].groupId!
      chrome.tabs
        .group({ tabIds: [tabId] })
        .then((newGroupId) => {
          chrome.tabGroups
            .move(newGroupId, { index: targetGroupId })
            .catch(logLastError)
        })
        .catch(logLastError)
    }
    return
  }

  // 不在组中：创建新组
  chrome.tabs
    .group({ tabIds: [tabId], createProperties: { windowId: tab.windowId } })
    .then((groupId) => {
      chrome.tabGroups.update(groupId, { collapsed: false }).catch(logLastError)
    })
    .catch(logLastError)
}

/**
 * 将当前标签页从组中移除
 */
export const ungroupCurrentTab = async (tabId: number) => {
  const tab = await chrome.tabs.get(tabId).catch(logLastError)
  if (!tab || tab.groupId === -1) return

  chrome.tabs.ungroup(tabId).catch(logLastError)
}

/**
 * 折叠/展开当前标签页所属的组
 */
export const toggleGroupCollapse = async (tabId: number) => {
  const tab = await chrome.tabs.get(tabId).catch(logLastError)
  if (!tab || tab.groupId === -1) return

  const group = await chrome.tabGroups.get(tab.groupId).catch(logLastError)
  if (!group) return

  chrome.tabGroups
    .update(group.id, { collapsed: !group.collapsed })
    .catch(logLastError)
}

/**
 * 关闭当前标签页所属组内的所有标签页
 */
export const closeGroupTabs = async (tabId: number) => {
  const tab = await chrome.tabs.get(tabId).catch(logLastError)
  if (!tab || tab.groupId === -1) return

  const tabs = await chrome.tabs.query({ windowId: tab.windowId })
  const groupTabs = tabs.filter((t) => t.groupId === tab.groupId)
  const toRemove = groupTabs.map((t) => t.id!).filter(Boolean)

  if (toRemove.length > 0) {
    chrome.tabs.remove(toRemove).catch(logLastError)
  }
}
