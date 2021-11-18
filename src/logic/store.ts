import { reactive } from 'vue'
import { useToggle, useLocalStorage } from '@vueuse/core'

// 键盘布局
export const KEYBOARD_KEY = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z', 'x', 'c', 'v', 'b', 'n', 'm']
export const KEY_OF_INDEX = { q: 0, w: 1, e: 2, r: 3, t: 4, y: 5, u: 6, i: 7, o: 8, p: 9, a: 10, s: 11, d: 12, f: 13, g: 14, h: 15, j: 16, k: 17, l: 18, z: 19, x: 20, c: 21, v: 22, b: 23, n: 24, m: 25 }

// 书签内按键触发间隔
export const PRESS_INTERVAL_TIME = 200

export const SETTING_TAB_LIST = [
  { label: 'tabGeneral', value: 1 },
  { label: 'tabBookmarks', value: 2 },
]

const defaultLang = chrome.i18n.getUILanguage() || 'en-US'

interface IState {
  setting: {
    lastSyncTimestamp: number
    common: {
      localLanguage: string
    }
    bookmarks: {
      [key: string]: {
        url: string
        icon?: string
        name?: string
      }
    }
  }
}

export const globalState: IState = reactive({
  setting: {
    lastSyncTimestamp: useLocalStorage('lastSyncTimestamp', 0, { listenToStorageChanges: true }),
    common: {
      localLanguage: useLocalStorage('localLanguage', defaultLang, { listenToStorageChanges: true }),
    },
    bookmarks: useLocalStorage('bookmarks', {}, { listenToStorageChanges: true }),
  },
})

export const [isSettingMode, toggleIsSettingMode] = useToggle(false)
