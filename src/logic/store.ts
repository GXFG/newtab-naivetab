import { reactive } from 'vue'
import { useToggle, useLocalStorage } from '@vueuse/core'
import pkg from '../../package.json'
import { POSITION_TYPE_TO_STYLE_MAP } from './const'

const defaultLang = chrome.i18n.getUILanguage() || 'en-US'

interface IState {
  setting: {
    version: string
    syncTime: number
    general: {
      pageTitle: string
      lang: string
    }
    clock: {
      enabled: boolean
      layout: {
        positionType: number
        xOffset: number
        yOffset: number
      }
    }
    calendar: {
      enabled: boolean
      layout: {
        positionType: number
        xOffset: number
        yOffset: number
      }
    }
    bookmarks: {
      enabled: boolean
      layout: {
        positionType: number
        xOffset: number
        yOffset: number
      }
      keymap: {
        [propName: string]: {
          url: string
          name?: string
        }
      }
    }
  }
}

export const globalState: IState = reactive({
  setting: {
    version: pkg.version,
    syncTime: useLocalStorage('syncTime', 0, { listenToStorageChanges: true }),
    general: useLocalStorage('general', {
      pageTitle: 'NewTab',
      lang: defaultLang,
    }, { listenToStorageChanges: true }),
    clock: useLocalStorage('clock', {
      enabled: true,
      layout: {
        positionType: 5,
        xOffset: 50,
        yOffset: 50,
      },
    }, { listenToStorageChanges: true }),
    calendar: useLocalStorage('calendar', {
      enabled: true,
      layout: {
        positionType: 7,
        xOffset: 0,
        yOffset: 0,
      },
    }, { listenToStorageChanges: true }),
    bookmarks: useLocalStorage('bookmarks', {
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

watch(() => globalState.setting.general.pageTitle, (value) => {
  document.title = value
})

export const [isSettingMode, toggleIsSettingMode] = useToggle(false)

export const getLayoutStyle = (name: 'bookmarks' | 'clock' | 'calendar') => {
  const layout = globalState.setting[name].layout
  const styleList = POSITION_TYPE_TO_STYLE_MAP[layout.positionType]
  let res = `${styleList[0].prop}:${layout.xOffset}%;${styleList[1].prop}:${layout.yOffset}%;`
  for (const style of styleList.slice(2)) {
    res += `${style.prop}:${style.value};`
  }
  return res
}
