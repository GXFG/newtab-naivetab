/**
 * @module store/state
 * @description 全局运行时状态 — globalState 定义 + 设置面板/Drawer/扩展商店等 UI 操作函数。
 *   不持久化、不同步，仅当前标签页有效。包含 drawerStack 管理子 Drawer 的 ESC 关闭顺序。
 * @dependencies env.ts、constants/urls.ts、logic/utils/common.ts
 * @consumers 几乎所有 UI 模块（Setting/Widget/Content）
 * @see docs/architecture/config.md#三层配置架构
 */
import { isEdge, isFirefox } from '@/env'
import {
  URL_CHROME_STORE,
  URL_EDGE_STORE,
  URL_FIREFOX_STORE,
} from '@/logic/constants/urls'
import { createTab } from '@/logic/utils/common'

export const globalState = reactive({
  settingMode: 'drawer' as 'drawer' | 'options',
  isSettingDrawerVisible: false,
  drawerStack: [] as Array<{ code: string; close: () => void }>,
  isGuideMode: false,
  isFullScreen: !!document.fullscreenElement,
  availableFontList: [] as string[],
  isUploadSettingLoading: false,
  isImportSettingLoading: false,
  isClearStorageLoading: false,
  isChangelogModalVisible: false,
  isSearchFocused: false,
  isInputFocused: false,
  currSettingTabCode: 'general',
  currSettingAnchor: '',
  isBackgroundDrawerAutoOpen: false,
})

const initAvailableFontList = async () => {
  const { FONT_LIST } = await import('@/logic/constants/fonts')
  const fontCheck = new Set(FONT_LIST.sort())
  await document.fonts.ready
  const availableList: Set<string> = new Set()
  for (const font of fontCheck.values()) {
    if (font === 'system') {
      availableList.add(font)
      continue
    }
    if (document.fonts.check(`12px "${font}"`)) {
      availableList.add(font)
    }
  }
  globalState.availableFontList = [...availableList.values()]
}

export const switchSettingDrawerVisible = (status: boolean) => {
  globalState.isSettingDrawerVisible = status
  if (status && globalState.availableFontList.length === 0) {
    initAvailableFontList()
  }
}

export const openChangelogModal = () => {
  globalState.isChangelogModalVisible = true
}

export const openExtensionsStorePage = () => {
  let storeUrl = URL_CHROME_STORE
  if (isEdge) {
    storeUrl = URL_EDGE_STORE
  } else if (isFirefox) {
    storeUrl = URL_FIREFOX_STORE
  }
  createTab(storeUrl)
}

export const openDrawer = (code: string, close: () => void): (() => void) => {
  globalState.drawerStack.push({ code, close })
  return () => {
    const idx = globalState.drawerStack.findIndex((d) => d.code === code)
    if (idx !== -1) globalState.drawerStack.splice(idx, 1)
    close()
  }
}

export const closeTopDrawer = () => {
  const entry = globalState.drawerStack.pop()
  entry?.close()
}

export const closeSettingDrawer = () => {
  while (globalState.drawerStack.length > 0) {
    const entry = globalState.drawerStack.pop()!
    entry.close()
    if (entry.code === 'setting') break
  }
  switchSettingDrawerVisible(false)
}
