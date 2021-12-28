import { reactive } from 'vue'
import { useToggle, useLocalStorage } from '@vueuse/core'
import pkg from '../../package.json'
import { DAYJS_LANG_MAP } from './const'

const defaultLang = chrome.i18n.getUILanguage() || 'en-US'

export const globalState = reactive({
  state: {
    isWhatsNewModalVisible: false,
  },
  localState: useLocalStorage('localState', {
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
  }, { listenToStorageChanges: true }),
  style: useLocalStorage('style', {
    general: {
      fontFamily: 'PingFang SC, Microsoft YaHei',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
      backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(53, 54, 58, 1)'],
    },
    bookmark: {
      margin: 4,
      width: 50,
      fontFamily: '',
      fontSize: 12,
      fontColor: ['rgba(15, 23, 42, 1)', 'rgba(15, 23, 42, 1)'],
      backgroundColor: ['rgba(209, 213, 219, 1)', 'rgba(212, 212, 216, 1)'],
      activeColor: ['rgba(255, 255, 255, 1)', 'rgba(53, 54, 58, 1)'],
      isBorderEnabled: true,
      borderColor: ['rgba(71,85,105, 1)', 'rgba(71,85,105, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(44, 62, 80, 0.1)', 'rgba(0, 0, 0, 0.15)'],
    },
    clockDigital: {
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
    },
    clockAnalog: {
      width: 150,
    },
    date: {
      fontFamily: 'Arial Rounded MT Bold',
      fontSize: 24,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(228, 228, 231, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(181, 181, 181, 1)', 'rgba(33, 33, 33, 1)'],
    },
    calendar: {
      width: 45,
      fontFamily: '',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
      backgroundColor: ['rgba(209, 213, 219, 1)', 'rgba(58, 58, 58, 1)'],
      activeColor: ['rgba(209, 213, 219, 1)', 'rgba(113, 113, 113, 1)'],
      isBorderEnabled: true,
      borderColor: ['rgba(71,85,105, 1)', 'rgba(82, 82, 82, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(14, 30, 37, 0.12)', 'rgba(14, 30, 37, 0.12)'],
    },
    weather: {
      iconWidth: 70,
      fontFamily: 'Arial Rounded MT Bold',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
    },
  }, { listenToStorageChanges: true }),
  setting: {
    syncTime: useLocalStorage('syncTime', 0, { listenToStorageChanges: true }),
    general: useLocalStorage('general', {
      version: pkg.version,
      layout: {
        xOffsetKey: 'right',
        xOffsetValue: 1,
        xTranslateValue: 0,
        yOffsetKey: 'top',
        yOffsetValue: 50,
        yTranslateValue: -50,
      },
      theme: 'auto', // light | dark | auto
      pageTitle: 'NewTab',
      lang: defaultLang,
      drawerPlacement: 'right' as any,
    }, { listenToStorageChanges: true }),
    bookmark: useLocalStorage('bookmark', {
      enabled: true,
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'top',
        yOffsetValue: 1,
        yTranslateValue: 0,
      },
      keymap: {},
      isDblclickOpen: true,
      dblclickIntervalTime: 200, // ms
    }, { listenToStorageChanges: true }),
    clockDigital: useLocalStorage('clockDigital', {
      enabled: true,
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'top',
        yOffsetValue: 50,
        yTranslateValue: -50,
      },
      format: 'hh:mm:ss',
      unitEnabled: true,
    }, { listenToStorageChanges: true }),
    clockAnalog: useLocalStorage('clockAnalog', {
      enabled: true,
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'top',
        yOffsetValue: 25,
        yTranslateValue: 0,
      },
      theme: 0, // theme list 索引
    }, { listenToStorageChanges: true }),
    date: useLocalStorage('date', {
      enabled: true,
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'top',
        yOffsetValue: 58,
        yTranslateValue: 0,
      },
      format: 'YYYY-MM-DD dddd',
    }, { listenToStorageChanges: true }),
    calendar: useLocalStorage('calendar', {
      enabled: true,
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 0,
        xTranslateValue: 0,
        yOffsetKey: 'bottom',
        yOffsetValue: 0,
        yTranslateValue: 0,
      },
    }, { listenToStorageChanges: true }),
    weather: useLocalStorage('weather', {
      enabled: true,
      forecastEnabled: false,
      layout: {
        xOffsetKey: 'left',
        xOffsetValue: 50,
        xTranslateValue: -50,
        yOffsetKey: 'bottom',
        yOffsetValue: 0,
        yTranslateValue: 0,
      },
      apiKey: 'bc9a224f841945f0bb2104157212811',
      city: {
        label: 'Beijing, Beijing, China',
        value: 'beijing-shi-beijing-china',
      },
      aqi: 'no',
      temperatureUnit: 'c', // 'c' | 'f'
      speedUnit: 'kph', // 'kph' | 'mph'
      iconEnabled: true,
    }, { listenToStorageChanges: true }),
  },
})

export const currDayjsLang = computed(() => DAYJS_LANG_MAP[globalState.setting.general.lang] || 'en')

export const [isSettingDrawerVisible, toggleIsSettingDrawVisible] = useToggle(false)

export const changeLogNotify = () => {
  const currSettingVersion = +globalState.setting.general.version.split('.').join('')
  const currPkgVersion = +pkg.version.split('.').join('')
  if (currSettingVersion >= currPkgVersion) {
    return
  }
  globalState.setting.general.version = pkg.version
  globalState.state.isWhatsNewModalVisible = true
}

export const initPageTitle = () => {
  document.title = globalState.setting.general.pageTitle
}

watch(() => globalState.setting.general.pageTitle, () => {
  initPageTitle()
})

watch(() => [
  globalState.style.general,
  globalState.localState.currThemeCode,
], () => {
  document.body.style.setProperty('--text-color-main', globalState.style.general.fontColor[globalState.localState.currThemeCode])
  document.body.style.setProperty('--bg-main', globalState.style.general.backgroundColor[globalState.localState.currThemeCode])
}, {
  immediate: true,
  deep: true,
})

// export const getLayoutStyle = (name: string) => {
//   const layout = globalState.setting[name].layout
//   const styleList = POSITION_TYPE_TO_STYLE_MAP[layout.positionType]
//   let res = `${styleList[0].prop}:${layout.xOffset}%;${styleList[1].prop}:${layout.yOffset}%;`
//   for (const style of styleList.slice(2)) {
//     res += `${style.prop}:${style.value};`
//   }
//   return res
// }

export const getLayoutStyle = (name: string) => {
  const style = `${globalState.setting[name].layout.xOffsetKey}:${globalState.setting[name].layout.xOffsetValue}vw; ${globalState.setting[name].layout.yOffsetKey}:${globalState.setting[name].layout.yOffsetValue}vh; transform:translate(${globalState.setting[name].layout.xTranslateValue}%, ${globalState.setting[name].layout.yTranslateValue}%);`
  return style
}

export const formatNumWithPixl = (component: TComponents, ...field: any) => {
  const style = field.reduce((r: any, c: string) => r[c], globalState.style[component])
  return `${style}px`
}

export const openNewPage = (url: string) => {
  if (url.length === 0) {
    return
  }
  window.open(url)
}
