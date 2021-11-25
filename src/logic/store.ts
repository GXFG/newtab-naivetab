import { reactive } from 'vue'
import { useToggle, useLocalStorage } from '@vueuse/core'
import pkg from '../../package.json'
import { POSITION_TYPE_TO_STYLE_MAP } from './const'

const defaultLang = chrome.i18n.getUILanguage() || 'en-US'

export const globalState = reactive({
  localState: useLocalStorage('localState', {
    currThemeCode: 0,
  }, { listenToStorageChanges: true }),
  setting: {
    version: pkg.version,
    syncTime: useLocalStorage('syncTime', 0, { listenToStorageChanges: true }),
    general: useLocalStorage('general', {
      theme: 'auto', // 0light, 1dark, 2auto
      pageTitle: 'NewTab',
      lang: defaultLang,
      style: {
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei',
        fontSize: 14,
        fontColor: ['#2c3e50', '#ffffff'],
        backgroundColor: ['#ffffff', '#35363a'],
      },
    }, { listenToStorageChanges: true }),
    date: useLocalStorage('date', {
      enabled: true,
      layout: {
        positionType: 5,
        xOffset: 50,
        yOffset: 60,
      },
      style: {
        fontFamily: '"Arial Rounded MT Bold"',
        fontSize: 20,
        fontColor: ['#2c3e50', '#e4e4e7'],
      },
    }, { listenToStorageChanges: true }),
    clock: useLocalStorage('clock', {
      enabled: true,
      layout: {
        positionType: 5,
        xOffset: 50,
        yOffset: 50,
      },
      style: {
        fontFamily: '"Arial Rounded MT Bold"',
        fontSize: 30,
        fontColor: ['#2c3e50', '#e4e4e7'],
      },
    }, { listenToStorageChanges: true }),
    calendar: useLocalStorage('calendar', {
      enabled: true,
      layout: {
        positionType: 7,
        xOffset: 0,
        yOffset: 0,
      },
      style: {
        fontFamily: '',
        fontSize: 14,
      },
    }, { listenToStorageChanges: true }),
    bookmarks: useLocalStorage('bookmarks', {
      enabled: true,
      layout: {
        positionType: 2,
        xOffset: 50,
        yOffset: 1,
      },
      style: {
        fontFamily: '',
        fontSize: 12,
        fontColor: ['#0f172a', '#0f172a'],
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
  globalState.setting.general.style,
  globalState.localState.currThemeCode,
], () => {
  document.body.style.setProperty('--text-color-main', globalState.setting.general.style.fontColor[globalState.localState.currThemeCode])
  document.body.style.setProperty('--bg-main', globalState.setting.general.style.backgroundColor[globalState.localState.currThemeCode])
}, {
  immediate: true,
  deep: true,
})

export const getLayoutStyle = (name: 'bookmarks' | 'date' | 'clock' | 'calendar') => {
  const layout = globalState.setting[name].layout
  const styleList = POSITION_TYPE_TO_STYLE_MAP[layout.positionType]
  let res = `${styleList[0].prop}:${layout.xOffset}%;${styleList[1].prop}:${layout.yOffset}%;`
  for (const style of styleList.slice(2)) {
    res += `${style.prop}:${style.value};`
  }
  return res
}

export const getCustomFontSize = (name: 'general' | 'bookmarks' | 'date' | 'clock' | 'calendar') => {
  return `${globalState.setting[name].style.fontSize}px`
}
