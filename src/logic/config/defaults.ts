/**
 * @module defaults
 * @description 默认配置定义。聚合 general/keyboard/widget 默认值，供 createLocalConfig 使用。
 * @dependencies common/widget-constants.ts（WIDGET_CODE_LIST）、image/constants.ts（背景图源常量）
 * @consumers config/store.ts（createLocalConfig）、config/merge.ts（合并模板）、config/sync/loader.ts（空值 fallback）
 * @pitfalls
 *   - widgetsDefaultConfig 通过 import.meta.glob 扫描 widgets 目录下各 config.ts 动态聚合，新增 Widget 无需修改此文件
 *   - KEYBOARD_COMMAND_CONFIG 和 KEYBOARD_COMMON_CONFIG 放在 defaults 而非各自模块，避免 config 反向依赖业务域
 *   - PRESERVE_FIELDS 标记了 Widget 重置时保留的字段，新增 Widget 必须在 config.ts 中定义 PRESERVE_FIELDS
 * @see docs/architecture/config.md#三层配置架构
 */
import type { WidgetConfigByCode } from '@/common/widget-constants'
import { WIDGET_CODE_LIST } from '@/common/widget-constants'
import {
  IMAGE_NETWORK_SOURCE,
  BACKGROUND_IMAGE_SOURCE,
} from '@/logic/image/constants'
import pkg from '../../../package.json'

const UI_LANGUAGE = chrome.i18n.getUILanguage()
const CURR_LANG = UI_LANGUAGE || 'en-US'

export const defaultFocusVisibleWidgetMap = {
  ...(Object.fromEntries(
    WIDGET_CODE_LIST.map((code) => [code, false]),
  ) as Record<WidgetCodes, boolean>),
  clockDigital: true,
  clockAnalog: true,
  clockFlip: true,
  clockNeon: true,
  date: true,
  search: true,
}

const generalConfig = {
  isFirstOpen: true,
  version: pkg.version,
  showBreakingChangeNotice: false,
  appearance: 'auto' as 'light' | 'dark' | 'auto',
  pageTitle: CURR_LANG === 'zh-CN' ? '新标签页' : 'NaiveTab',
  lang: CURR_LANG,
  timeLang: CURR_LANG,
  drawerPlacement: 'right' as TDrawerPlacement,
  openPageFocusElement: 'default' as TPageFocusElement,
  isLoadPageAnimationEnabled: true,
  loadPageAnimationType: 'fade-in' as 'fade-in' | 'zoom-in',
  focusVisibleWidgetMap: defaultFocusVisibleWidgetMap,
  isBackgroundImageEnabled: true,
  backgroundImageSource:
    BACKGROUND_IMAGE_SOURCE.NETWORK as (typeof BACKGROUND_IMAGE_SOURCE)[keyof typeof BACKGROUND_IMAGE_SOURCE],
  backgroundImageList: [
    { networkSourceType: IMAGE_NETWORK_SOURCE.PEXELS, name: '19161535' },
    { networkSourceType: IMAGE_NETWORK_SOURCE.PEXELS, name: '36873465' },
  ],
  backgroundImageHighQuality: true,
  isBackgroundImageCustomUrlEnabled: false,
  backgroundImageCustomUrls: [
    'https://cn.bing.com/th?id=OHR.DarwinsArch_ZH-CN9740478501_1920x1080.jpg',
    'https://cn.bing.com/th?id=OHR.DolomitesMW_ZH-CN3307894335_1920x1080.jpg',
  ],
  favoriteImageList: [
    {
      networkSourceType: IMAGE_NETWORK_SOURCE.BING,
      name: 'DarwinsArch_ZH-CN9740478501',
    },
    {
      networkSourceType: IMAGE_NETWORK_SOURCE.BING,
      name: 'ChukchiSea_ZH-CN7218471261',
    },
    {
      networkSourceType: IMAGE_NETWORK_SOURCE.BING,
      name: 'DolomitesMW_ZH-CN3307894335',
    },
    {
      networkSourceType: IMAGE_NETWORK_SOURCE.BING,
      name: 'YurisNight_ZH-CN5738817931',
    },
    {
      networkSourceType: IMAGE_NETWORK_SOURCE.BING,
      name: 'Balsamroot_ZH-CN9456182640',
    },
    {
      networkSourceType: IMAGE_NETWORK_SOURCE.PEXELS,
      name: '19161535',
    },
  ] as {
    networkSourceType: (typeof IMAGE_NETWORK_SOURCE)[keyof typeof IMAGE_NETWORK_SOURCE]
    name: string
  }[],
  layout: {
    xOffsetKey: 'right',
    xOffsetValue: 1,
    xTranslateValue: 0,
    yOffsetKey: 'top',
    yOffsetValue: 50,
    yTranslateValue: -50,
  },
  fontFamily: 'system',
  fontSize: 14,
  fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
  primaryColor: ['rgba(58, 115, 195, 1)', 'rgba(100, 160, 230, 1)'],
  backgroundColor: ['rgba(232, 236, 241, 1)', 'rgba(26, 26, 46, 1)'],
  bgOpacity: 1,
  bgBlur: 0,
  isParallaxEnabled: true,
  parallaxIntensity: 5,
  swatcheColors: [
    'rgba(255, 255, 255, 1)',
    'rgba(15, 23, 42, 1)',
    'rgba(44, 62, 80, 1)',
    'rgba(58, 115, 195, 1)',
  ],
}

const widgetsDefaultConfig = (() => {
  const modules = import.meta.glob('../../newtab/widgets/**/config.ts', {
    eager: true,
  }) as Record<string, any>
  const map: Record<string, any> = {}
  for (const key in modules) {
    const m = modules[key]
    if (m && m.WIDGET_CODE && m.WIDGET_CONFIG) {
      map[m.WIDGET_CODE] = m.WIDGET_CONFIG
    }
  }
  return map as WidgetConfigByCode
})()

/**
 * 命令快捷键默认配置。
 * 定义在 defaults 而非 shortcut/，避免 config 反向依赖业务域。
 */
export const KEYBOARD_COMMAND_CONFIG = {
  isEnabled: true,
  noModifierMode: false,
  shortcutInInputElement: true,
  urlBlacklist: [] as string[],
  modifiers: ['shift', 'alt'] as Array<'ctrl' | 'shift' | 'alt' | 'meta'>,
  keymap: {
    KeyQ: { command: 'moveTabLeft' },
    KeyE: { command: 'moveTabRight' },
    KeyA: { command: 'prevTab' },
    KeyD: { command: 'nextTab' },
    KeyF: { command: 'moveTabToNextWindow' },
    KeyG: { command: 'moveWindowToNextDisplay' },
    KeyH: { command: 'goHome' },
    KeyR: { command: 'reloadPage' },
    KeyT: { command: 'newTabAfter' },
    KeyO: { command: 'reloadAllTabsAllWindows' },
    KeyP: { command: 'reopenClosedTab' },
    KeyW: { command: 'scrollToTop' },
    KeyS: { command: 'scrollToBottom' },
    KeyI: { command: 'scrollUp' },
    KeyK: { command: 'scrollDown' },
    KeyJ: { command: 'scrollLeft' },
    KeyL: { command: 'scrollRight' },
    Comma: { command: 'scrollPageUp' },
    Period: { command: 'scrollPageDown' },
    Backquote: { command: 'lastUsedTab' },
    KeyZ: { command: 'lastUsedTab' },
    KeyX: { command: 'closeTab' },
    KeyC: { command: 'duplicateTab' },
    KeyV: { command: 'toggleTabPinned' },
    KeyB: { command: 'toggleGroupCollapse' },
    KeyN: { command: 'groupCurrentTab' },
    KeyM: { command: 'ungroupCurrentTab' },
    KeyY: { command: 'cycleBookmarkLayers' },
    KeyU: { command: 'copyPageUrl' },
    BracketLeft: { command: 'goBack' },
    BracketRight: { command: 'goForward' },
    Backslash: { command: 'mergeAllWindows' },
    Slash: { command: 'toggleFocusMode' },
    Digit1: { command: 'switchToPinnedTab1' },
    Digit2: { command: 'switchToPinnedTab2' },
    Digit3: { command: 'switchToPinnedTab3' },
    Digit4: { command: 'switchToPinnedTab4' },
    Digit5: { command: 'switchToPinnedTab5' },
    Digit6: { command: 'switchToPinnedTab6' },
    Digit7: { command: 'switchToPinnedTab7' },
    Digit8: { command: 'switchToPinnedTab8' },
    Digit9: { command: 'switchToPinnedTab9' },
    Digit0: { command: 'switchToPinnedTabLast' },
    Minus: { command: 'firstTab' },
    Equal: { command: 'lastTab' },
  } as Record<string, { command: string }>,
}

/**
 * 键盘通用外观默认配置。
 * 定义在 defaults 而非 keyboard/，避免 config 反向依赖业务域。
 */
export const KEYBOARD_COMMON_CONFIG = {
  keyboardType: 'key61',
  splitSpace: 'space1' as 'space1' | 'space2' | 'space3',
  keyboardWklMode: false,
  keycapType: 'gmk' as KeycapVisualType,
  keycapPadding: 1.5,
  keycapSize: 58,
  keycapBorderRadius: 5,
  isKeycapBorderEnabled: false,
  keycapBorderWidth: 1,
  keycapBorderColor: ['rgba(71, 85, 105, 1)', 'rgba(73, 73, 77, 1)'],
  isShellVisible: true,
  shellVerticalPadding: 15,
  shellHorizontalPadding: 15,
  shellBorderRadius: 10,
  shellColor: ['rgba(225, 219, 209, 1.0)', 'rgba(51,65,85,1.0)'],
  isShellShadowEnabled: true,
  shellShadowColor: ['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.4)'],
  shellBackgroundBlur: 5,
  isPlateVisible: true,
  platePadding: 3,
  plateBorderRadius: 5,
  plateColor: ['rgba(80, 80, 80, 0.7)', 'rgba(119, 119, 119, 0.5)'],
  isCapKeyVisible: true,
  keycapKeyFontFamily: 'OpenCherry',
  keycapKeyFontSize: 12,
  isNameVisible: true,
  keycapBookmarkFontFamily: 'Arial',
  keycapBookmarkFontSize: 11,
  isFaviconVisible: true,
  faviconSize: 0.85,
  isTactileBumpsVisible: true,
  mainFontColor: ['rgba(60,65,70,1.0)', 'rgba(226,232,240,1.0)'],
  mainBackgroundColor: ['rgba(235,238,240,1.0)', 'rgba(71,85,105,1.0)'],
  emphasisOneFontColor: ['rgba(235,238,240,1.0)', 'rgba(226,232,240,1.0)'],
  emphasisOneBackgroundColor: ['rgba(80,85,90,1.0)', 'rgba(30,41,59,1.0)'],
  emphasisTwoFontColor: ['rgba(60,65,70,1.0)', 'rgba(30,41,59,1.0)'],
  emphasisTwoBackgroundColor: [
    'rgba(160,165,170,1.0)',
    'rgba(148,163,184,1.0)',
  ],
  emphasisKeyOverrides: {} as Record<string, 0 | 1 | 2>,
}

export const defaultConfig = {
  general: generalConfig,
  keyboardCommon: KEYBOARD_COMMON_CONFIG,
  keyboardCommand: KEYBOARD_COMMAND_CONFIG,
  ...widgetsDefaultConfig,
}

export const defaultUploadStatusItem = {
  loading: false,
  syncTime: 0,
  syncId: '',
  localModifiedTime: 0,
  dirty: false,
}

const genUploadConfigStatusMap = () => {
  const statusMap = {} as {
    [key in ConfigField]: {
      loading: boolean
      syncTime: number
      syncId: string
      localModifiedTime: number
      dirty: boolean
    }
  }
  for (const widget in defaultConfig) {
    statusMap[widget as ConfigField] = { ...defaultUploadStatusItem }
  }
  return statusMap
}

// ---- 重置保留字段 ----

/** 键盘命令配置的 code，用于 reset.ts 中标识非 Widget 配置项 */
export const COMMAND_SHORTCUT_CODE = 'keyboardCommand'

export const defaultLocalState = {
  currAppearanceLabel: 'light' as 'light' | 'dark',
  currAppearanceCode: 0 as 0 | 1,
  isUploadConfigStatusMap: genUploadConfigStatusMap(),
  isFocusMode: false, // 专注模式开关：频繁切换、仅本地生效，无需云同步
}
