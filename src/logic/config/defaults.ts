import type { WidgetConfigByCode } from '@/newtab/widgets/registry'
import { WIDGET_CODE_LIST } from '@/newtab/widgets/codes'
import pkg from '../../../package.json'
import { KEYBOARD_COMMAND_CONFIG } from '@/logic/globalShortcut/shortcut-command'
import {
  IMAGE_NETWORK_SOURCE,
  BACKGROUND_IMAGE_SOURCE,
} from '@/logic/constants/image'
import { KEYBOARD_COMMON_CONFIG } from '@/logic/keyboard/keyboard-config'

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
  backgroundNetworkSourceType:
    IMAGE_NETWORK_SOURCE.BING as (typeof IMAGE_NETWORK_SOURCE)[keyof typeof IMAGE_NETWORK_SOURCE],
  backgroundImageHighQuality: true,
  backgroundImageNames: [
    'DarwinsArch_ZH-CN9740478501',
    'DolomitesMW_ZH-CN3307894335',
  ],
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

export const defaultLocalState = {
  currAppearanceLabel: 'light' as 'light' | 'dark',
  currAppearanceCode: 0 as 0 | 1,
  isUploadConfigStatusMap: genUploadConfigStatusMap(),
  isFocusMode: false, // 专注模式开关：频繁切换、仅本地生效，无需云同步
}
