import { reactive } from 'vue'
import { useToggle, useLocalStorage } from '@vueuse/core'
import pkg from '../../package.json'

export const POSITION_TYPE_TO_STYLE_MAP = {
  1: [
    { prop: 'left', value: 0 },
    { prop: 'top', value: 0 },
  ],
  2: [
    { prop: 'left', value: 50 },
    { prop: 'top', value: 0 },
    { prop: 'transform', value: 'translate(-50%, 0)' },
  ],
  3: [
    { prop: 'right', value: 0 },
    { prop: 'top', value: 0 },
  ],
  4: [
    { prop: 'left', value: 0 },
    { prop: 'top', value: 50 },
    { prop: 'transform', value: 'translate(0, -50%)' },
  ],
  5: [
    { prop: 'left', value: 50 },
    { prop: 'top', value: 50 },
    { prop: 'transform', value: 'translate(-50%, -50%)' },
  ],
  6: [
    { prop: 'right', value: 0 },
    { prop: 'top', value: 50 },
    { prop: 'transform', value: 'translate(0, -50%)' },
  ],
  7: [
    { prop: 'left', value: 0 },
    { prop: 'bottom', value: 0 },
  ],
  8: [
    { prop: 'left', value: 50 },
    { prop: 'bottom', value: 0 },
    { prop: 'transform', value: 'translate(-50%, 0)' },
  ],
  9: [
    { prop: 'right', value: 0 },
    { prop: 'bottom', value: 0 },
  ],
}

export const KEYBOARD_KEY = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z', 'x', 'c', 'v', 'b', 'n', 'm']
export const KEY_OF_INDEX = { q: 0, w: 1, e: 2, r: 3, t: 4, y: 5, u: 6, i: 7, o: 8, p: 9, a: 10, s: 11, d: 12, f: 13, g: 14, h: 15, j: 16, k: 17, l: 18, z: 19, x: 20, c: 21, v: 22, b: 23, n: 24, m: 25 }

export const BOOKMARK_ACTIVE_PRESS_INTERVAL = 200

const defaultLang = chrome.i18n.getUILanguage() || 'en-US'

interface IState {
  setting: {
    version: string
    syncTime: number
    general: {
      lang: string
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
  }
}

export const globalState: IState = reactive({
  setting: {
    version: pkg.version,
    syncTime: useLocalStorage('syncTime', 0, { listenToStorageChanges: true }),
    general: useLocalStorage('general', {
      lang: defaultLang,
    }, { listenToStorageChanges: true }),
    bookmarks: useLocalStorage('bookmarks', {
      enabled: true,
      layout: {
        positionType: 2,
        xOffset: 0,
        yOffset: 0,
      },
      keymap: {},
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
  },
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
