/**
 * keyboardBookmark Widget 展示层逻辑。
 *
 * 跨层共享的状态和数据管理已提取到 @/logic/keyboard/bookmark-state，
 * 此文件仅保留 Widget 专属的键帽渲染、页面导航、视觉反馈等。
 */
import { gaProxy } from '@/logic/utils/gtag'
import { createTab } from '@/logic/utils/common'
import { localConfig } from '@/logic/config/state'
import {
  state as keyboardState,
  getBookmarkConfigName,
  getBookmarkConfigUrl,
} from '@/logic/keyboard/bookmark-state'
import { KEYCAP_ACTIVE_DURATION } from '@/logic/keyboard/keyboard-constants'

// ── Widget 专属逻辑 ──────────────────────────────────────────────────

export const getKeycapName = (keyCode: string) => {
  return getBookmarkConfigName(keyCode)
}

export const getKeycapUrl = (keyCode: string) => {
  return getBookmarkConfigUrl(keyCode)
}

/**
 * 延迟重置按键视觉反馈（用于 openPage 导航场景）。
 *
 * 使用 clearTimeout + setTimeout 的防抖模式：如果用户快速连续按多个键
 * 执行同页导航，只有最后一次导航生效（页面立即跳转，后续调用被中断）。
 */
let delayResetTimer: ReturnType<typeof setTimeout>
const delayResetPressKey = () => {
  clearTimeout(delayResetTimer)
  delayResetTimer = setTimeout(() => {
    keyboardState.currSelectKeyCode = ''
  }, KEYCAP_ACTIVE_DURATION)
}

export const openPage = (
  url: string,
  isBgOpen = false,
  isNewTabOpen = false,
  keyCode?: string,
) => {
  if (url.length === 0) return
  gaProxy('click', ['openBookmark'], {
    source: keyCode ? 'widget_key' : 'widget_click',
    ...(keyCode ? { key_code: keyCode } : {}),
  })
  if (isBgOpen) {
    createTab(url, false)
    delayResetPressKey()
    return
  }
  if (
    isNewTabOpen ||
    localConfig.keyboardBookmark.isNewTabOpen ||
    !/http/.test(url)
  ) {
    createTab(url)
    delayResetPressKey()
    return
  }
  keyboardState.isLoadPageLoading = true
  window.location.href = url
}

export const handlePressKeycap = (keyCode: string) => {
  keyboardState.currSelectKeyCode = keyCode
  setTimeout(() => {
    keyboardState.currSelectKeyCode = ''
  }, KEYCAP_ACTIVE_DURATION)
}
