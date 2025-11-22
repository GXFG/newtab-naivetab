import type { WidgetConfigByCode } from '@/newtab/widgets/registry'
import { WIDGET_CODE_LIST } from '@/newtab/widgets/codes'
import pkg from '../../package.json'

const UI_LANGUAGE = chrome.i18n.getUILanguage()
const CURR_LANG = UI_LANGUAGE || 'en-US'

export const defaultFocusVisibleWidgetMap = {
  ...Object.fromEntries(WIDGET_CODE_LIST.map((code) => [code, false])) as Record<WidgetCodes, boolean>,
  clockDigital: true,
  date: true,
}

const generalConfig = {
  isFirstOpen: true,
  version: pkg.version,
  appearance: 'auto' as 'light' | 'dark' | 'auto',
  pageTitle: CURR_LANG === 'zh-CN' ? '新标签页' : 'NaiveTab',
  lang: CURR_LANG,
  timeLang: CURR_LANG,
  drawerPlacement: 'right' as TDrawerPlacement,
  openPageFocusElement: 'default' as TPageFocusElement,
  isLoadPageAnimationEnabled: true,
  loadPageAnimationType: 'fade-in' as 'fade-in' | 'zoom-in',
  isFocusMode: false,
  focusVisibleWidgetMap: defaultFocusVisibleWidgetMap,
  isBackgroundImageEnabled: true,
  backgroundImageSource: 1 as 0 | 1 | 2, // 0 localFile, 1 network, 2 bing Photo of the Day
  backgroundNetworkSourceType: 1 as 1 | 2, // 1 Bing, 2 Pexels
  backgroundImageHighQuality: false,
  backgroundImageNames: ['ChukchiSea_ZH-CN7218471261', 'DolomitesMW_ZH-CN3307894335'],
  isBackgroundImageCustomUrlEnabled: false,
  backgroundImageCustomUrls: ['https://cn.bing.com/th?id=OHR.ChukchiSea_ZH-CN7218471261_1920x1080.jpg', 'https://cn.bing.com/th?id=OHR.DolomitesMW_ZH-CN3307894335_1920x1080.jpg'],
  favoriteImageList: [
    { networkSourceType: 1, name: 'ChukchiSea_ZH-CN7218471261' },
    { networkSourceType: 1, name: 'DolomitesMW_ZH-CN3307894335' },
    { networkSourceType: 1, name: 'YosemiteNightSky_ZH-CN5864740024' },
    { networkSourceType: 1, name: 'LavaTube_ZH-CN5458469336' },
    { networkSourceType: 1, name: 'YurisNight_ZH-CN5738817931' },
    { networkSourceType: 1, name: 'PrathameshJaju_ZH-CN2207606082' },
    { networkSourceType: 1, name: 'AthensAcropolis_ZH-CN9942357439' },
    { networkSourceType: 1, name: 'Balsamroot_ZH-CN9456182640' },
    { networkSourceType: 1, name: 'DarwinsArch_ZH-CN9740478501' },
    { networkSourceType: 1, name: 'ChurchillBears_ZH-CN1430090934' },
    { networkSourceType: 1, name: 'WinterHalo_ZH-CN0666553211' },
    { networkSourceType: 2, name: '19161535' },
  ] as {
    networkSourceType: 1 | 2
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
  fontFamily: 'Arial',
  fontSize: 14,
  fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
  primaryColor: ['rgba(16, 152, 173, 1)', 'rgba(16, 152, 173, 1)'],
  backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(53, 54, 58, 1)'],
  bgOpacity: 1,
  bgBlur: 0,
  swatcheColors: [
    'rgba(255, 255, 255, 1)',
    'rgba(16, 152, 173, 1)',
    'rgba(159, 214, 255, 1)',
    'rgba(213, 255, 203, 0.8)',
    'rgba(255, 110, 110, 0.4)',
    'rgba(250, 82, 82, 1)',
    'rgba(101, 101, 101, 0.28)',
    'rgba(122, 122, 122, 0.5)',
    'rgba(209, 213, 219, 1)',
    'rgba(73, 73, 77, 1)',
    'rgba(44, 62, 80, 1)',
    'rgba(15, 23, 42, 1)',
  ],
}

const widgetsDefaultConfig = (() => {
  const modules = import.meta.glob('../newtab/widgets/**/config.ts', { eager: true }) as Record<string, any>
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
  ...widgetsDefaultConfig,
}

export const defaultUploadStatusItem = {
  loading: false,
  syncTime: 0,
  syncId: '',
}

const genUploadConfigStatusMap = () => {
  const statusMap = {} as {
    [key in ConfigField]: {
      loading: boolean
      syncTime: number
      syncId: string
    }
  }
  for (const widget in defaultConfig) {
    statusMap[widget] = defaultUploadStatusItem
  }
  return statusMap
}

export const defaultLocalState = {
  currAppearanceLabel: 'light' as 'light' | 'dark',
  currAppearanceCode: 0 as 0 | 1, // 0:light | 1:dark
  isUploadConfigStatusMap: genUploadConfigStatusMap(),
}
