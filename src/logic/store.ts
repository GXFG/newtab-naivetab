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

export const MONTHS_ENUM = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

export const INN_HOLIDAY_ENUM = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '03-15': '消费者权益日',
  '04-01': '愚人节',
  '04-22': '地球日',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-03': '抗战胜利日',
  '09-10': '教师节',
  '10-01': '国庆节',
  '12-24': '平安夜',
  '12-25': '圣诞节',
}

export const LEGAL_HOLIDAY_TYPE_TO_DESC = {
  1: '休',
  2: '班',
}

export const LEGAL_HOLIDAY_ENUM: any = {
  2022: {
    '01-01': 1,
    '01-02': 1,
    '01-03': 1,
    '01-29': 2,
    '01-30': 2,
    '01-31': 1,
    '02-01': 1,
    '02-02': 1,
    '02-03': 1,
    '02-04': 1,
    '02-05': 1,
    '02-06': 1,
    '04-02': 2,
    '04-03': 1,
    '04-04': 1,
    '04-05': 1,
    '04-24': 2,
    '04-30': 1,
    '05-01': 1,
    '05-02': 1,
    '05-03': 1,
    '05-04': 1,
    '05-07': 2,
    '06-03': 1,
    '06-04': 1,
    '06-05': 1,
    '09-10': 1,
    '09-11': 1,
    '09-12': 1,
    '10-01': 1,
    '10-02': 1,
    '10-03': 1,
    '10-04': 1,
    '10-05': 1,
    '10-06': 1,
    '10-07': 1,
    '10-08': 2,
    '10-09': 2,
  },
}

const defaultLang = chrome.i18n.getUILanguage() || 'en-US'

interface IState {
  setting: {
    lastSyncTimestamp: number
    generic: {
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
    generic: {
      localLanguage: useLocalStorage('localLanguage', defaultLang, { listenToStorageChanges: true }),
    },
    bookmarks: useLocalStorage('bookmarks', {}, { listenToStorageChanges: true }),
  },
})

export const [isSettingMode, toggleIsSettingMode] = useToggle(false)
