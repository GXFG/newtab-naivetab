export const KEYBOARD_KEY = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'z', 'x', 'c', 'v', 'b', 'n', 'm']

export const KEY_OF_INDEX = { q: 0, w: 1, e: 2, r: 3, t: 4, y: 5, u: 6, i: 7, o: 8, p: 9, a: 10, s: 11, d: 12, f: 13, g: 14, h: 15, j: 16, k: 17, l: 18, z: 19, x: 20, c: 21, v: 22, b: 23, n: 24, m: 25 }

export const BOOKMARK_ACTIVE_PRESS_INTERVAL = 200

export const MERGE_SETTING_DELAY = 2000

export const THEME_TO_CODE_MAP = {
  light: 0,
  dark: 1,
}

export const ANALOG_CLOCK_THEME = [
  { label: 'light', value: 0 },
  { label: 'dark', value: 1 },
]

export const WEATHER_LANG_MAP = {
  'zh-CN': 'zh',
  'en-US': '',
}

export const WEATHER_TEMPERATURE_UNIT_MAP = {
  c: '℃',
  f: '℉',
}

export const WEATHER_SPEED_UNIT_MAP = {
  mph: 'mph',
  kph: 'km/h',
}

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

export const LEGAL_HOLIDAY_ENUM: any = {
  2022: {
    '0101': 1,
    '0102': 1,
    '0103': 1,
    '0129': 2,
    '0130': 2,
    '0131': 1,
    '0201': 1,
    '0202': 1,
    '0203': 1,
    '0204': 1,
    '0205': 1,
    '0206': 1,
    '0402': 2,
    '0403': 1,
    '0404': 1,
    '0405': 1,
    '0424': 2,
    '0430': 1,
    '0501': 1,
    '0502': 1,
    '0503': 1,
    '0504': 1,
    '0507': 2,
    '0603': 1,
    '0604': 1,
    '0605': 1,
    '0910': 1,
    '0911': 1,
    '0912': 1,
    '1001': 1,
    '1002': 1,
    '1003': 1,
    '1004': 1,
    '1005': 1,
    '1006': 1,
    '1007': 1,
    '1008': 2,
    '1009': 2,
  },
}
