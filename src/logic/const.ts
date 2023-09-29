/* eslint-disable prettier/prettier */
export const URL_FEEDBACK_EMAIL = 'mailto:gxfgim@outlook.com?subject=NaiveTab Feedback'
export const URL_CHROME_STORE = 'https://chrome.google.com/webstore/detail/naivetab-%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/hhfebdcoeoddbdhgcgflblcjcgogijem?utm_source=chrome-ntp-icon'
export const URL_EDGE_STORE = 'https://microsoftedge.microsoft.com/addons/detail/naivetab-%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/kejadmppkffccjopodhekdnmkofidmjl'

export const URL_CHROME_EXTENSIONS_SHORTCUTS = 'chrome://extensions/shortcuts#:~:text=NaiveTab-,%2D%20%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5,-%E6%BF%80%E6%B4%BB%E8%AF%A5%E6%89%A9%E5%B1%95'
export const URL_EDGE_EXTENSIONS_SHORTCUTS = 'edge://extensions/shortcuts#:~:text=%E5%9C%A8%20Edge%20%E4%B8%AD-,NaiveTab%20%2D%20%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5,-%E6%BF%80%E6%B4%BB%E6%89%A9%E5%B1%95'

export const URL_GITHUB_HOME = 'https://github.com/GXFG/newtab-naivetab'
export const URL_GITHUB_ISSUSE = 'https://github.com/GXFG/newtab-naivetab/issues'
export const URL_NAIVETAB_DOC_HOME = 'https://gxfg.github.io/naivetab-doc/'
export const URL_NAIVETAB_DOC_STARTED = 'https://gxfg.github.io/naivetab-doc/guide/getting-started.html'

export const URL_DAYJS_FORMAT = 'https://dayjs.gitee.io/docs/zh-CN/display/format'
export const URL_QWEATHER_HOME = 'https://www.qweather.com/'
export const URL_QWEATHER_START = 'https://dev.qweather.com/docs/start'

/**
 * MAX_WRITE_OPERATIONS_PER_HOUR = 1800 https://developer.chrome.com/docs/extensions/reference/storage/#property-sync
 * 3600s / 1800 = 2s
 */
export const MERGE_CONFIG_DELAY = 2000
export const MERGE_CONFIG_MAX_DELAY = 5000

export const DRAG_TRIGGER_DISTANCE = 20

export const FAVORITE_IMAGE_MAX_COUNT = 16

export const LOCAL_BACKGROUND_IMAGE_MAX_SIZE_M = 15

export const SECOND_MODAL_WIDTH = 550

export const TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
}
export const APPEARANCE_TO_CODE_MAP = {
  light: 0,
  dark: 1,
}

export const DAYJS_LANG_MAP = {
  'zh-CN': 'zh-cn',
  'en-US': 'en',
}

export const FONT_LIST = [
  // common
  'Cascadia Code',
  'Fira Code',
  // local
  'Arial Rounded MT Bold',
  'OpenCherry',
  'KBD',
  'LED7',
  'Advanced Led Board-7',
  'KBSkittled',
  'LESLIEB',
  'The Led Display St',
  'LCDMono2',
  'LCD',
  'Pixel Lcd Machine',
  // Windows
  'Arial',
  'Arial Black',
  'Bahnschrift',
  'Calibri',
  'Cambria',
  'Cambria Math',
  'Candara',
  'Comic Sans MS',
  'Consolas',
  'Constantia',
  'Corbel',
  'Courier New',
  'Ebrima',
  'Franklin Gothic Medium',
  'Gabriola',
  'Gadugi',
  'Georgia',
  'HoloLens MDL2 Assets',
  'Impact',
  'Ink Free',
  'Javanese Text',
  'Leelawadee UI',
  'Lucida Console',
  'Lucida Sans Unicode',
  'Malgun Gothic',
  'Marlett',
  'Microsoft Himalaya',
  'Microsoft JhengHei',
  'Microsoft New Tai Lue',
  'Microsoft PhagsPa',
  'Microsoft Sans Serif',
  'Microsoft Tai Le',
  'Microsoft YaHei',
  'Microsoft Yi Baiti',
  'MingLiU-ExtB',
  'Mongolian Baiti',
  'MS Gothic',
  'MV Boli',
  'Myanmar Text',
  'Nirmala UI',
  'Palatino Linotype',
  'Segoe MDL2 Assets',
  'Segoe Print',
  'Segoe Script',
  'Segoe UI',
  'Segoe UI Historic',
  'Segoe UI Emoji',
  'Segoe UI Symbol',
  'SimSun',
  'Sitka',
  'Sylfaen',
  'Symbol',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Webdings',
  'Wingdings',
  'Yu Gothic',
  // macOS
  'American Typewriter',
  'Andale Mono',
  'Arial',
  'Arial Black',
  'Arial Narrow',
  'Arial Rounded MT Bold',
  'Arial Unicode MS',
  'Avenir',
  'Avenir Next',
  'Avenir Next Condensed',
  'Baskerville',
  'Big Caslon',
  'Bodoni 72',
  'Bodoni 72 Oldstyle',
  'Bodoni 72 Smallcaps',
  'Bradley Hand',
  'Brush Script MT',
  'Chalkboard',
  'Chalkboard SE',
  'Chalkduster',
  'Charter',
  'Cochin',
  'Comic Sans MS',
  'Copperplate',
  'Courier',
  'Courier New',
  'Didot',
  'DIN Alternate',
  'DIN Condensed',
  'Futura',
  'Geneva',
  'Georgia',
  'Gill Sans',
  'Helvetica',
  'Helvetica Neue',
  'Herculanum',
  'Hoefler Text',
  'Impact',
  'Lucida Grande',
  'Luminari',
  'Marker Felt',
  'Menlo',
  'Microsoft Sans Serif',
  'Monaco',
  'Noteworthy',
  'Optima',
  'Palatino',
  'Papyrus',
  'Phosphate',
  'Rockwell',
  'Savoye LET',
  'SignPainter',
  'Skia',
  'Snell Roundhand',
  'Tahoma',
  'Times',
  'Times New Roman',
  'Trattatello',
  'Trebuchet MS',
  'Verdana',
  'Zapfino',
]

export const KEYBOARD_OLD_TO_NEW_CODE_MAP = {
  '1': 'Digit1',
  '2': 'Digit2',
  '3': 'Digit3',
  '4': 'Digit4',
  '5': 'Digit5',
  '6': 'Digit6',
  '7': 'Digit7',
  '8': 'Digit8',
  '9': 'Digit9',
  '0': 'Digit0',
  q: 'KeyQ',
  w: 'KeyW',
  e: 'KeyE',
  r: 'KeyR',
  t: 'KeyT',
  y: 'KeyY',
  u: 'KeyU',
  i: 'KeyI',
  o: 'KeyO',
  p: 'KeyP',
  a: 'KeyA',
  s: 'KeyS',
  d: 'KeyD',
  f: 'KeyF',
  g: 'KeyG',
  h: 'KeyH',
  j: 'KeyJ',
  k: 'KeyK',
  l: 'KeyL',
  z: 'KeyZ',
  x: 'KeyX',
  c: 'KeyC',
  v: 'KeyV',
  b: 'KeyB',
  n: 'KeyN',
  m: 'KeyM',
  '-': 'Minus',
  '+': 'Equal',
  BS: 'Backspace',
  '{': 'BracketLeft',
  '}': 'BracketRight',
  ':': 'Semicolon',
  '"': 'Quote',
  '<': 'Comma',
  '>': 'Period',
  '?': 'Slash',
}

export const NEWS_SOURCE_MAP = {
  toutiao: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
  baidu: 'https://top.baidu.com/board?tab=realtime',
  zhihu: 'https://www.zhihu.com/hot',
  weibo: 'https://s.weibo.com/top/summary?cate=realtimehot',
  kr36: 'https://36kr.com/hot-list/catalog',
  v2ex: 'https://www.v2ex.com/?tab=hot',
  bilibili: 'https://www.bilibili.com/v/popular/rank/all',
}

export const SEARCH_ENGINE_LIST = [
  { label: 'Baidu', value: 'https://www.baidu.com/s?word={query}' },
  { label: 'Bing', value: 'https://cn.bing.com/search?q={query}' },
  { label: 'Google', value: 'https://www.google.com/search?q={query}' },
  { label: 'Github', value: 'https://github.com/search?q={query}' },
  { label: 'Qwant', value: 'https://www.qwant.com/?q={query}' },
  { label: 'Duckduckgo', value: 'https://duckduckgo.com?q={query}' },
  { label: 'Yandex', value: 'https://yandex.com/search?text={query}' },
  { label: 'Yahoo', value: 'https://search.yahoo.com/search?p={query}' },
  { label: 'Sogou', value: 'https://www.sogou.com/web?query={query}' },
  { label: '360', value: 'https://www.so.com/s?q={query}' },
]

export const WEATHER_LANG_MAP = {
  'zh-CN': 'zh',
  'en-US': 'en',
}

export const WEATHER_TEMPERATURE_UNIT_MAP = {
  c: '℃',
  f: '℉',
}

export const WEATHER_SPEED_UNIT_MAP = {
  mph: 'mph',
  kph: 'km/h',
}

export const FOCUE_ELEMENT_SELECTOR_MAP = {
  root: '#app',
  search: '#search .n-input__input-el',
  memo: '#memo .n-input__textarea-el',
  bookmarkKeyboard: '#bookmark',
}
