export const URL_FEEDBACK = 'mailto:gxfgim@outlook.com?subject=NaiveTab Feedback'
export const URL_CHROME_STORE = 'https://chrome.google.com/webstore/detail/naivetab-%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/hhfebdcoeoddbdhgcgflblcjcgogijem?utm_source=chrome-ntp-icon'
export const URL_EDGE_STORE = 'https://microsoftedge.microsoft.com/addons/detail/naivetab-%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/kejadmppkffccjopodhekdnmkofidmjl'

export const URL_CHROME_EXTENSIONS_SHORTCUTS = 'chrome://extensions/shortcuts#:~:text=NaiveTab-,%2D%20%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5,-%E6%BF%80%E6%B4%BB%E8%AF%A5%E6%89%A9%E5%B1%95'
export const URL_EDGE_EXTENSIONS_SHORTCUTS = 'edge://extensions/shortcuts#:~:text=%E5%9C%A8%20Edge%20%E4%B8%AD-,NaiveTab%20%2D%20%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5,-%E6%BF%80%E6%B4%BB%E6%89%A9%E5%B1%95'

export const URL_GITHUB = 'https://github.com/GXFG/newtab-naivetab'
export const URL_GITHUB_ISSUSE = 'https://github.com/GXFG/newtab-naivetab/issues'

export const URL_DAYJS_FORMAT = 'https://dayjs.gitee.io/docs/zh-CN/display/format'
export const URL_QWEATHER_START = 'https://dev.qweather.com/docs/start'
export const URL_QWEATHER_HOME = 'https://www.qweather.com/'

export const FONT_LIST = [
  // common
  'Arial Rounded MT Bold', 'Cascadia Code', 'Fira Code',
  // Windows
  'Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Cambria', 'Cambria Math', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 'HoloLens MDL2 Assets', 'Impact', 'Ink Free', 'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Sans Unicode', 'Malgun Gothic', 'Marlett', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Palatino Linotype', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Historic', 'Segoe UI Emoji', 'Segoe UI Symbol', 'SimSun', 'Sitka', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic',
  // macOS
  'American Typewriter', 'Andale Mono', 'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS', 'Avenir', 'Avenir Next', 'Avenir Next Condensed', 'Baskerville', 'Big Caslon', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bradley Hand', 'Brush Script MT', 'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charter', 'Cochin', 'Comic Sans MS', 'Copperplate', 'Courier', 'Courier New', 'Didot', 'DIN Alternate', 'DIN Condensed', 'Futura', 'Geneva', 'Georgia', 'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Herculanum', 'Hoefler Text', 'Impact', 'Lucida Grande', 'Luminari', 'Marker Felt', 'Menlo', 'Microsoft Sans Serif', 'Monaco', 'Noteworthy', 'Optima', 'Palatino', 'Papyrus', 'Phosphate', 'Rockwell', 'Savoye LET', 'SignPainter', 'Skia', 'Snell Roundhand', 'Tahoma', 'Times', 'Times New Roman', 'Trattatello', 'Trebuchet MS', 'Verdana', 'Zapfino',
]

export const KEYBOARD_KEY_LIST = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '+', 'BS', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '{', '}', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ':', '"', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '<', '>', '?']

/**
 * real key code -> label key name
 */
export const KEYBOARD_CODE_TO_LABEL_MAP = {
  Minus: '-',
  Equal: '+',
  Backspace: 'BS',
  BracketLeft: '{',
  BracketRight: '}',
  Semicolon: ':',
  Quote: '"',
  Comma: '<',
  Period: '>',
  Slash: '?',
}

export const KEYBOARD_SPLIT_RANGE_MAP = {
  letter: [[13, 23], [25, 34], [36, 43]],
  letterSymbol: [[13, 25], [25, 36], [36]],
  letterNumber: [[[0, 10], [12, 13]], [13, 23], [25, 34], [36, 43]], // 特殊处理：数字行 + BS = [[0, 10], [12, 13]]
  letterSymbolNumber: [[0, 13], [13, 25], [25, 36], [36]],
}

/**
 * MAX_WRITE_OPERATIONS_PER_HOUR = 1800 https://developer.chrome.com/docs/extensions/reference/storage/#property-sync
 * 3600s / 1800 = 2s
 */
export const MERGE_CONFIG_DELAY = 2000
export const MERGE_CONFIG_MAX_DELAY = 5000

export const DRAG_TRIGGER_DISTANCE = 20

export const FAVORITE_IMAGE_MAX_COUNT = 16

export const LOCAL_BACKGROUND_IMAGE_MAX_SIZE_M = 15

export const APPEARANCE_TO_CODE_MAP = {
  light: 0,
  dark: 1,
}

export const DAYJS_LANG_MAP = {
  'zh-CN': 'zh-cn',
  'en-US': 'en',
}

export const SEARCH_ENGINE_LIST = [
  { label: 'baidu', value: 'https://www.baidu.com/s?word={query}' },
  { label: 'bing', value: 'https://cn.bing.com/search?q={query}' },
  { label: 'google', value: 'https://www.google.com/search?q={query}' },
  { label: 'github', value: 'https://github.com/search?q={query}' },
  { label: 'qwant', value: 'https://www.qwant.com/?q={query}' },
  { label: 'duckduckgo', value: 'https://duckduckgo.com?q={query}' },
  { label: 'yandex', value: 'https://yandex.com/search?text={query}' },
  { label: 'yahoo', value: 'https://search.yahoo.com/search?p={query}' },
  { label: 'sogou', value: 'https://www.sogou.com/web?query={query}' },
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

export const NEWS_SOURCE_MAP = {
  baidu: 'https://top.baidu.com/board?tab=realtime',
  zhihu: 'https://www.zhihu.com/hot',
  weibo: 'https://s.weibo.com/top/summary?cate=realtimehot',
  v2ex: 'https://www.v2ex.com/?tab=hot',
}

/**
 * 1休，2班
 */
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
