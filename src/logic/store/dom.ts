/**
 * @module store/dom
 * @description DOM 副作用 — 全屏状态同步、CSS 变量（背景色/字体色）的动态注入。
 *   通过 watch 响应 localConfig.general.backgroundColor / fontColor 变化。
 * @dependencies config/state.ts、state.ts（globalState）、style.ts（getStyleField）
 * @consumers newtab/App.vue（onMounted 中调用 setupDomSync）
 * @see docs/architecture/config.md#主题与颜色系统
 */
import { localConfig, localState } from '@/logic/config/state'
import { globalState } from './state'
import { getStyleField } from './style'

const onFullscreenChange = () => {
  globalState.isFullScreen = !!document.fullscreenElement
}

export const initFullscreenSync = () => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
}

export const cleanupFullscreenSync = () => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
}

export const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else if (document.exitFullscreen) {
    document.exitFullscreen()
  }
}

let domStyleWatchers: Array<() => void> | null = null

export const initDomStyleWatchers = () => {
  if (domStyleWatchers) return
  const pageTitleStop = watch(
    () => localConfig.general.pageTitle,
    () => {
      document.title = localConfig.general.pageTitle
    },
    { immediate: true },
  )
  const cssVarsStop = watch(
    [
      () => localConfig.general.backgroundColor,
      () => localConfig.general.fontColor,
      () => localState.value.currAppearanceCode,
    ],
    () => {
      document.body.style.setProperty(
        '--nt-bg-main',
        getStyleField('general', 'backgroundColor').value,
      )
      document.body.style.setProperty(
        '--nt-text-color-main',
        getStyleField('general', 'fontColor').value,
      )
    },
    {
      immediate: true,
      deep: true,
    },
  )
  domStyleWatchers = [pageTitleStop, cssVarsStop]
}

export const cleanupDomStyleWatchers = () => {
  domStyleWatchers?.forEach((stop) => stop())
  domStyleWatchers = null
}
