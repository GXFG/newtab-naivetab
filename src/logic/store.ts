import { useToggle } from '@vueuse/core'
import pkg from '../../package.json'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { styleConst } from '@/styles/index'
import { DAYJS_LANG_MAP, FONT_LIST, toggleIsDragMode, moveState } from '@/logic'

const defaultLang = chrome.i18n.getUILanguage() || 'en-US'

export const [isSettingDrawerVisible, toggleIsSettingDrawerVisible] = useToggle(false)
export const currSettingTabValue = ref('general')

export const globalState = reactive({
  state: {
    isWhatsNewModalVisible: false,
    isSearchFocused: false,
    isMemoFocused: false,
  },
  localState: useStorageLocal('local-state', {
    currAppearanceCode: 0, // 0:light | 1:dark
    availableFontList: [] as any[],
    weather: {
      now: {
        syncTime: 0,
        cloud: '', // "0"
        dew: '', // "-20"
        feelsLike: '', // "-2"
        humidity: '', // "22"
        icon: '', // "100"
        obsTime: '', // "2022-01-29T11:13+08:00"
        precip: '', // "0.0"
        pressure: '', // "1024"
        temp: '', // "2"
        text: '', // "晴"
        vis: '', // "30"
        wind360: '', // "0"
        windDir: '', // "北风"
        windScale: '', // "2"
        windSpeed: '', // "7"
      },
      air: {
        syncTime: 0,
        aqi: '', // "31"
        category: '', // "优"
        co: '', // "0.3"
        level: '', // "1"
        no2: '', // "15"
        o3: '', // "64"
        pm2p5: '', // "20"
        pm10: '', // "31"
        primary: '', // "NA"
        pubTime: '', // "2022-01-29T15:00+08:00"
        so2: '', // "1"
      },
      indices: {
        syncTime: 0,
        list: [] as IndicesItem[],
      },
      warning: {
        syncTime: 0,
        list: [] as WarningItem[],
      },
      forecast: {
        syncTime: 0,
        list: [],
      },
    },
  }),
  syncTime: useStorageLocal('setting-sync-time', 0),
  style: {
    general: useStorageLocal('style-general', {
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
      backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(53, 54, 58, 1)'],
      isBackgroundImageEnabled: true,
      backgroundImageSource: 1, // 0:localFile, 1:bing
      backgroundImageUrl: '',
      backgroundImageId: '', // images[0].urlbase e.g.: '/th?id=OHR.SnowyPrague_ZH-CN9794475183'
      bgOpacity: 0.7,
      bgBlur: 10,
    }),
    settingIcon: useStorageLocal('style-setting-icon', {
      layout: {
        xOffsetKey: 'right',
        xOffsetValue: 1,
        xTranslateValue: 0,
        yOffsetKey: 'top',
        yOffsetValue: 50,
        yTranslateValue: -50,
      },
    }),
    bookmark: useStorageLocal('style-bookmark', {
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'top',
        yOffsetValue: 1,
        yTranslateValue: 0,
      },
      margin: 3,
      width: 50,
      fontFamily: 'Arial',
      fontSize: 12,
      fontColor: ['rgba(15, 23, 42, 1)', 'rgba(15, 23, 42, 1)'],
      backgroundColor: ['rgba(209, 213, 219, 1)', 'rgba(212, 212, 216, 1)'],
      activeColor: ['rgba(255, 255, 255, 1)', 'rgba(71,85,105, 1)'],
      isBorderEnabled: true,
      borderWidth: 1,
      borderColor: ['rgba(71,85,105, 1)', 'rgba(71,85,105, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(44, 62, 80, 0.1)', 'rgba(0, 0, 0, 0.15)'],
    }),
    clockDigital: useStorageLocal('style-clock-digital', {
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'top',
        yOffsetValue: 50,
        yTranslateValue: -50,
      },
      fontFamily: 'Arial Rounded MT Bold',
      fontSize: 80,
      letterSpacing: 2,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(228, 228, 231, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(181, 181, 181, 1)', 'rgba(33, 33, 33, 1)'],
      unit: {
        fontSize: 30,
      },
    }),
    clockAnalog: useStorageLocal('style-clock-analog', {
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'top',
        yOffsetValue: 25,
        yTranslateValue: 0,
      },
      width: 150,
    }),
    date: useStorageLocal('style-date', {
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'top',
        yOffsetValue: 58,
        yTranslateValue: 0,
      },
      fontFamily: 'Arial Rounded MT Bold',
      fontSize: 24,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(228, 228, 231, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(181, 181, 181, 1)', 'rgba(33, 33, 33, 1)'],
    }),
    calendar: useStorageLocal('style-calendar', {
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 0,
        xTranslateValue: 0,
        yOffsetKey: 'bottom',
        yOffsetValue: 0,
        yTranslateValue: 0,
      },
      width: 45,
      fontFamily: 'Arial',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
      backgroundColor: ['rgba(209, 213, 219, 0.75)', 'rgba(58, 58, 58, 0.75)'],
      activeColor: ['rgba(209, 213, 219, 1)', 'rgba(113, 113, 113, 1)'],
      isBorderEnabled: true,
      borderWidth: 1,
      borderColor: ['rgba(71,85,105, 1)', 'rgba(82, 82, 82, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(14, 30, 37, 0.12)', 'rgba(14, 30, 37, 0.12)'],
    }),
    search: useStorageLocal('style-search', {
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'bottom',
        yOffsetValue: 30,
        yTranslateValue: 0,
      },
      width: 330,
      fontFamily: 'Arial',
      fontSize: 18,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(228, 228, 231, 1)'],
      isBorderEnabled: true,
      borderWidth: 1,
      borderColor: ['rgba(167, 176, 188, 1)', 'rgba(167, 176, 188, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(31, 31, 31, 0.5)', 'rgba(31, 31, 31, 0.5)'],
    }),
    weather: useStorageLocal('style-weather', {
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'bottom',
        yOffsetValue: 0,
        yTranslateValue: 0,
      },
      fontFamily: 'Arial Rounded MT Bold',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
      iconSize: 50,
    }),
    memo: useStorageLocal('style-memo', {
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 0,
        xTranslateValue: 0,
        yOffsetKey: 'top',
        yOffsetValue: 0,
        yTranslateValue: 0,
      },
      width: 200,
      height: 200,
      fontFamily: 'Arial',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(228, 228, 231, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(181, 181, 181, 1)', 'rgba(33, 33, 33, 0.5)'],
    }),
  },
  setting: {
    general: useStorageLocal('setting-general', {
      version: pkg.version,
      appearance: 'auto', // light | dark | auto
      pageTitle: 'NewTab',
      lang: defaultLang,
      drawerPlacement: 'right' as any,
    }),
    settingIcon: useStorageLocal('setting-icon', {
      enabled: false,
    }),
    bookmark: useStorageLocal('setting-bookmark', {
      enabled: false,
      keymap: {},
      isDblclickOpen: true,
      dblclickIntervalTime: 200, // ms
    }),
    clockDigital: useStorageLocal('setting-clock-digital', {
      enabled: true,
      format: 'hh:mm:ss',
      unitEnabled: true,
    }),
    clockAnalog: useStorageLocal('setting-clock-analog', {
      enabled: false,
      theme: 0, // themeList的索引
    }),
    date: useStorageLocal('setting-date', {
      enabled: false,
      format: 'YYYY-MM-DD dddd',
    }),
    calendar: useStorageLocal('setting-calendar', {
      enabled: false,
    }),
    search: useStorageLocal('setting-search', {
      enabled: true,
      iconEnabled: true,
      suggestionEnabled: true,
      placeholder: 'baidu',
      urlName: 'baidu',
      urlValue: 'https://www.baidu.com/s?word={query}',
    }),
    weather: useStorageLocal('setting-weather', {
      enabled: false,
      apiKey: '72db57326f9f494ab04d1d431bc127e9',
      city: {
        id: '101010300', // 101010300
        name: '中国-北京市-北京-朝阳', // "中国-北京市-北京-朝阳"
      },
      temperatureUnit: 'c', // 'c' | 'f'
      speedUnit: 'kph', // 'kph' | 'mph'
      iconEnabled: true,
      forecastEnabled: false,
    }),
    memo: useStorageLocal('setting-memo', {
      enabled: false,
      countEnabled: true,
      content: '',
    }),
  },
})

export const currDayjsLang = computed(() => DAYJS_LANG_MAP[globalState.setting.general.lang] || 'en')

export const initAvailableFontList = async() => {
  const fontCheck = new Set(FONT_LIST.sort())
  await document.fonts.ready
  const availableList = new Set()
  for (const font of fontCheck.values()) {
    if (document.fonts.check(`12px "${font}"`)) {
      availableList.add(font)
    }
  }
  globalState.localState.availableFontList = [...availableList.values()]
}

// 第一次打开扩展时，打开画布模式&帮助弹窗
const isFirstOpen = ref(useStorageLocal('data-first', true))
export const initFirstOpen = () => {
  if (!isFirstOpen.value) {
    return
  }
  toggleIsDragMode(true)
  isFirstOpen.value = false
}

export const openWhatsNewModal = (forceOpen = false) => {
  if (forceOpen) {
    globalState.state.isWhatsNewModalVisible = true
  }
  const currSettingVersion = +globalState.setting.general.version.split('.').join('')
  const currPkgVersion = +pkg.version.split('.').join('')
  if (currSettingVersion >= currPkgVersion) {
    return
  }
  globalState.setting.general.version = pkg.version
  globalState.state.isWhatsNewModalVisible = true
}

export const closeWhatsNewModal = () => {
  globalState.state.isWhatsNewModalVisible = false
}

export const createTab = (url: string, active = true) => {
  if (url.length === 0) {
    return
  }
  chrome.tabs.create({ url, active })
}

export const getIsComponentRender = (componentName: Components) => computed(() => globalState.setting[componentName].enabled || moveState.dragTempEnabledMap[componentName])

export const getLayoutStyle = (name: string) => {
  let style = `${globalState.style[name].layout.xOffsetKey}:${globalState.style[name].layout.xOffsetValue}vw;`
  style += `${globalState.style[name].layout.yOffsetKey}:${globalState.style[name].layout.yOffsetValue}vh;`
  style += `transform:translate(${globalState.style[name].layout.xTranslateValue}%, ${globalState.style[name].layout.yTranslateValue}%);`
  return style
}

export const getStyleConst = (field: string) => {
  return computed(() => {
    return styleConst.value[field][globalState.localState.currAppearanceCode] || styleConst.value[field][0]
  })
}

/**
 * e.g. getStyleField('date', 'unit.fontSize', 'px', 1.2)
 */
export const getStyleField = (component: 'general' | Components, field: string, unit?: string, ratio?: number) => {
  return computed(() => {
    let style = field.split('.').reduce((r: any, c: string) => r[c], globalState.style[component])
    if (style instanceof Array) {
      return style[globalState.localState.currAppearanceCode]
    }
    if (ratio) {
      style = style * ratio
    }
    if (unit) {
      style = `${style}${unit}`
    }
    return style
  })
}

watch(() => globalState.setting.general.pageTitle, () => {
  document.title = globalState.setting.general.pageTitle
}, { immediate: true })

watch([
  () => globalState.style.general,
  () => globalState.localState.currAppearanceCode,
], () => {
  document.body.style.setProperty('--bg-main', getStyleField('general', 'backgroundColor').value)
  document.body.style.setProperty('--text-color-main', getStyleField('general', 'fontColor').value)
}, {
  immediate: true,
  deep: true,
})
