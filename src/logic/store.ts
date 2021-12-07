import { reactive } from 'vue'
import { useToggle, useLocalStorage } from '@vueuse/core'
import pkg from '../../package.json'
import { POSITION_TYPE_TO_STYLE_MAP } from './const'

const defaultLang = chrome.i18n.getUILanguage() || 'en-US'

export const globalState = reactive({
  localState: useLocalStorage('localState', {
    currThemeCode: 0, // 0light | 1dark
  }, { listenToStorageChanges: true }),
  style: useLocalStorage('style', {
    general: {
      fontFamily: 'PingFang SC, Microsoft YaHei',
      fontSize: 14,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
      backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(53, 54, 58, 1)'],
    },
    date: {
      fontFamily: 'Arial Rounded MT Bold',
      fontSize: 24,
      fontColor: ['rgba(44, 62, 80, 1)', 'rgba(228, 228, 231, 1)'],
      isShadowEnabled: true,
      shadowColor: ['rgba(181, 181, 181, 1)', 'rgba(33, 33, 33, 1)'],
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
      width: 130,
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
  }, { listenToStorageChanges: true }),
  setting: {
    version: pkg.version,
    syncTime: useLocalStorage('syncTime', 0, { listenToStorageChanges: true }),
    general: useLocalStorage('general', {
      theme: 'auto', // light | dark | auto
      pageTitle: 'NewTab',
      lang: defaultLang,
    }, { listenToStorageChanges: true }),
    date: useLocalStorage('date', {
      enabled: true,
      layout: {
        positionType: 5,
        xOffset: 50,
        yOffset: 58,
      },
      format: 'YYYY-MM-DD dddd',
    }, { listenToStorageChanges: true }),
    clockDigital: useLocalStorage('clockDigital', {
      enabled: true,
      layout: {
        positionType: 5,
        xOffset: 50,
        yOffset: 50,
      },
      format: 'hh:mm:ss',
      unitEnabled: true,
    }, { listenToStorageChanges: true }),
    clockAnalog: useLocalStorage('clockAnalog', {
      enabled: true,
      layout: {
        positionType: 8,
        xOffset: 50,
        yOffset: 5,
      },
      theme: 1,
    }, { listenToStorageChanges: true }),
    calendar: useLocalStorage('calendar', {
      enabled: true,
      layout: {
        positionType: 7,
        xOffset: 1,
        yOffset: 1,
      },
    }, { listenToStorageChanges: true }),
    bookmark: useLocalStorage('bookmark', {
      enabled: true,
      layout: {
        positionType: 2,
        xOffset: 50,
        yOffset: 1,
      },
      keymap: {},
    }, { listenToStorageChanges: true }),
  },
})

export const [isSettingMode, toggleIsSettingMode] = useToggle(false)

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

export const getLayoutStyle = (name: 'bookmark' | 'date' | 'clockDigital' | 'calendar') => {
  const layout = globalState.setting[name].layout
  const styleList = POSITION_TYPE_TO_STYLE_MAP[layout.positionType]
  let res = `${styleList[0].prop}:${layout.xOffset}%;${styleList[1].prop}:${layout.yOffset}%;`
  for (const style of styleList.slice(2)) {
    res += `${style.prop}:${style.value};`
  }
  return res
}

export const formatNumWithPixl = (component: 'general' | 'bookmark' | 'date' | 'clockDigital' | 'clockAnalog' | 'calendar', ...field: any) => {
  const res = field.reduce((r: any, c: string) => r[c], globalState.style[component])
  return `${res}px`
}
