import { useToggle } from '@vueuse/core'
import pkg from '../../package.json'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { styleConst } from '@/styles/index'
import { DAYJS_LANG_MAP, moveState } from '@/logic'

const defaultLang = chrome.i18n.getUILanguage() || 'en-US'

export const [isSettingDrawerVisible, toggleIsSettingDrawerVisible] = useToggle(false)
export const currSettingTabValue = ref('general')

export const globalState = reactive({
  state: {
    isWhatsNewModalVisible: false,
    isSearchFocused: false,
  },
  localState: useStorageLocal('local-state', {
    currThemeCode: 0, // 0:light | 1:dark
    weather: {
      syncTime: 0,
      current: {
        last_updated_epoch: 0, // 1638929700
        last_updated: '', // "2021-12-08 10:15"
        temp_c: '', // 1.0
        temp_f: '', // 33.8
        is_day: '', // 1
        condition: {
          text: '', // "Sunny"
          icon: '', // "//cdn.weatherapi.com/weather/64x64/day/113.png"
          code: '', // 1000
        },
        wind_mph: '', // 0.0
        wind_kph: '', // 0.0
        wind_degree: '', // 49
        wind_dir: '', // "NE"
        pressure_mb: '', // 1033.0
        pressure_in: '', // 30.5
        precip_mm: '', // 0.0
        precip_in: '', // 0.0
        humidity: '', // 69
        cloud: '', // 0
        feelslike_c: '', // 1.0
        feelslike_f: '', // 33.8
        vis_km: '', // 10.0
        vis_miles: '', // 6.0
        uv: '', // 1.0
        gust_mph: '', // 2.2
        gust_kph: '', // 3.6
      },
      forecastday: [] as TWeatherForecastdayItem[],
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
      fontFamily: 'PingFang SC, Microsoft YaHei',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
      backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(53, 54, 58, 1)'],
      isBackgroundImageEnabled: true,
      backgroundImageSource: 1, // 0:localFile, 1:bing
      backgroundImageUrl: '',
      backgroundImageId: '', // images[0].urlbase e.g.: '/th?id=OHR.SnowyPrague_ZH-CN9794475183'
      bgOpacity: 0.8,
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
      fontFamily: '',
      fontSize: 12,
      fontColor: ['rgba(15, 23, 42, 1)', 'rgba(15, 23, 42, 1)'],
      backgroundColor: ['rgba(209, 213, 219, 1)', 'rgba(212, 212, 216, 1)'],
      activeColor: ['rgba(255, 255, 255, 1)', 'rgba(71,85,105, 1)'],
      isBorderEnabled: true,
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
        fontColor: ['rgba(44, 62, 80, 1)', 'rgba(228, 228, 231, 1)'],
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
      fontFamily: '',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
      backgroundColor: ['rgba(209, 213, 219, 0.75)', 'rgba(58, 58, 58, 0.75)'],
      activeColor: ['rgba(209, 213, 219, 1)', 'rgba(113, 113, 113, 1)'],
      isBorderEnabled: true,
      borderColor: ['rgba(71,85,105, 1)', 'rgba(82, 82, 82, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(14, 30, 37, 0.12)', 'rgba(14, 30, 37, 0.12)'],
    }),
    search: useStorageLocal('style-search', {
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'top',
        yOffsetValue: 70,
        yTranslateValue: 0,
      },
      width: 350,
      fontFamily: 'Arial Rounded MT Bold',
      fontSize: 24,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(228, 228, 231, 1)'],
      isBorderEnabled: true,
      borderWidth: 2,
      borderColor: ['rgba(71,85,105, 1)', 'rgba(71,85,105, 1)'],
      activeColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(181, 181, 181, 1)', 'rgba(33, 33, 33, 1)'],
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
      iconWidth: 70,
      fontFamily: 'Arial Rounded MT Bold',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
    }),
  },
  setting: {
    general: useStorageLocal('setting-general', {
      version: pkg.version,
      theme: 'auto', // light | dark | auto
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
      enabled: false,
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
      urlName: 'baidu',
      urlValue: 'https://www.baidu.com/s?word={query}',
    }),
    weather: useStorageLocal('setting-weather', {
      enabled: false,
      forecastEnabled: false,
      apiKey: 'bc9a224f841945f0bb2104157212811',
      city: {
        label: 'Beijing, Beijing, China',
        value: 'beijing-shi-beijing-china',
      },
      aqi: 'no',
      temperatureUnit: 'c', // 'c' | 'f'
      speedUnit: 'kph', // 'kph' | 'mph'
      iconEnabled: true,
    }),
  },
})

export const currDayjsLang = computed(() => DAYJS_LANG_MAP[globalState.setting.general.lang] || 'en')

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

export const openNewPage = (url: string) => {
  if (url.length === 0) {
    return
  }
  window.open(url)
}

export const getIsComponentRender = (componentName: TComponents) => computed(() => globalState.setting[componentName].enabled || moveState.dragTempEnabledMap[componentName])

export const getLayoutStyle = (name: string) => {
  let style = `${globalState.style[name].layout.xOffsetKey}:${globalState.style[name].layout.xOffsetValue}vw;`
  style += `${globalState.style[name].layout.yOffsetKey}:${globalState.style[name].layout.yOffsetValue}vh;`
  style += `transform:translate(${globalState.style[name].layout.xTranslateValue}%, ${globalState.style[name].layout.yTranslateValue}%);`
  return style
}

export const getStyleConst = (field: string) => {
  return computed(() => {
    return styleConst.value[field][globalState.localState.currThemeCode] || styleConst.value[field][0]
  })
}

// e.g. getStyleField('date', 'unit.fontSize', 'px', 1.2)
export const getStyleField = (component: 'general' | TComponents, field: string, unit?: string, ratio?: number) => {
  return computed(() => {
    let style = field.split('.').reduce((r: any, c: string) => r[c], globalState.style[component])
    if (style instanceof Array) {
      return style[globalState.localState.currThemeCode]
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
  () => globalState.localState.currThemeCode,
], () => {
  document.body.style.setProperty('--text-color-main', getStyleField('general', 'fontColor').value)
  document.body.style.setProperty('--bg-main', getStyleField('general', 'backgroundColor').value)
}, {
  immediate: true,
  deep: true,
})
