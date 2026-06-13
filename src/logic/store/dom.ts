/**
 * @module store/dom
 * @description DOM 副作用 — 全屏状态同步、深色模式 data-theme 属性、CSS 变量的动态注入。
 *   通过 watch 响应 localConfig.general.backgroundColor / fontColor / primaryColor / fontSize 变化。
 *   data-theme 属性控制深色模式，所有 CSS token 通过 [data-theme='dark'] 选择器切换。
 *
 * ## 字体尺寸体系（--nt-font-*）
 *
 * 以 general.fontSize 为基准，按混合比例生成 8 级 CSS 变量，覆盖 2xs ~ 2xl。
 * 所有 Reka UI 组件通过 --text-* → var(--nt-font-*, fallback) 间接引用，
 * 用户修改基准字号后全局 UI 自动等比缩放。
 *
 * @dependencies config/state.ts、state.ts（globalState）、style.ts（getStyleField、customPrimaryColor）
 * @consumers newtab/App.vue（onMounted 中调用 setupDomSync）
 * @see docs/architecture/config.md#主题与颜色系统
 */
import { localConfig, localState } from '@/logic/config/state'
import { globalState } from './state'
import { getStyleField, customPrimaryColor } from './style'

/** 字体缩放比例：以 general.fontSize 为基准，混合等比（两端）与等差（中段）策略 */
const FONT_SCALE_RATIOS: Record<string, number> = {
  '2xs': 0.67,
  xs: 0.75,
  sm: 0.875,
  base: 1.0,
  md: 1.125,
  lg: 1.25,
  xl: 1.5,
  '2xl': 2.0,
}

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

  // data-theme 属性：替代 n-config-provider :theme 控制深色模式
  const themeAttrStop = watch(
    () => localState.value.currAppearanceCode,
    (code) => {
      document.documentElement.setAttribute(
        'data-theme',
        code === 1 ? 'dark' : 'light',
      )
    },
    { immediate: true },
  )

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
      () => localConfig.general.primaryColor,
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
      document.body.style.setProperty(
        '--nt-primary-color',
        customPrimaryColor.value,
      )
    },
    {
      immediate: true,
      deep: true,
    },
  )
  // 字体尺寸体系：从 general.fontSize 派生出 8 级 --nt-font-* CSS 变量
  const fontSizeStop = watch(
    () => localConfig.general.fontSize,
    (baseSize) => {
      const root = document.documentElement
      for (const [key, ratio] of Object.entries(FONT_SCALE_RATIOS)) {
        root.style.setProperty(
          `--nt-font-${key}`,
          `${Math.round(baseSize * ratio * 100) / 100}px`,
        )
      }
    },
    { immediate: true },
  )

  domStyleWatchers = [themeAttrStop, pageTitleStop, cssVarsStop, fontSizeStop]
}

export const cleanupDomStyleWatchers = () => {
  domStyleWatchers?.forEach((stop) => stop())
  domStyleWatchers = null
}
