// Add data types to window.navigator ambiently for implicit use in the entire project. See https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html#-reference-types- for more info.
/// <reference types="user-agent-data-types" />
interface Window {
  _gaq: any
  dataLayer: any
  $t: any // vue-i18n
  $message: any
  $notification: any
  $dialog: any
  $loadingBar: any
}

type KeyLabel = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | '-' | '+' | 'BS' | 'q' | 'w' | 'e' | 'r' | 't' | 'y' | 'u' | 'i' | 'o' | 'p' | '{' | '}' | 'a' | 's' | 'd' | 'f' | 'g' | 'h' | 'j' | 'k' | 'l' | ':' | '"' | 'z' | 'x' | 'c' | 'v' | 'b' | 'n' | 'm' | '<' | '>' | '?'

type DatabaseHandleType = 'add' | 'put' | 'get' | 'delete'
type DatabaseStore = 'localBackgroundImages' | 'currBackgroundImages'

interface BackgroundImageItem{
  appearanceCode: number
  file: File
  smallBase64: string
}

type OptionsPermission = 'bookmarks'

type TargetType = 1 | 2 // 1:component 2:element
type Components = 'bookmark' | 'clockDigital' | 'clockAnalog' | 'date' | 'calendar' | 'search' | 'weather' | 'memo' | 'news'
type ConfigField = Components | 'general'

type Placement = 'top' | 'bottom' | 'left' | 'right'
interface SelectStringItem {
  label: string
  value: string
}

interface KeyboardConfigItem {
  label: string
  textAlign: 'left' | 'center' | 'right'
  size: number
  alias?: string // LShift
  marginLeft?: number // default 0
  marginRight?: number // default 0
  marginBottom?: number // default 0
}

interface ChromeBookmarkItem {
  dateAdded: number // 1618456881151
  id: string // "130"
  index: number // 1
  parentId: string // "106"
  title: string // "StackBlitz"
  url: string // "https://stackblitz.com/"
  children: ChromeBookmarkItem[]
}

interface BookmarkItem {
  key: string
  url: string
  name?: string
}

interface Calendar {
  Animal: string // "牛"
  IDayCn: string // "廿九"
  IMonthCn: string // "冬月"
  Term: string | null
  astro: string // "魔羯座"
  cDay: number // 1
  cMonth: number // 1
  cYear: number // 2022
  date: string // "2022-1-1"
  festival: string // "元旦节"
  gzDay: string // "甲寅"
  gzMonth: string // "庚子"
  gzYear: string // "辛丑"
  isLeap: boolean
  isTerm: boolean
  isToday: boolean
  lDay: number // 29
  lMonth: number // 11
  lYear: number // 2021
  lunarDate: string // "2021-11-29"
  lunarFestival: string | null
  nWeek: number // 6
  ncWeek: string // "星期六"
}

interface FavoriteImageListItem {
  name: string
  desc: string
}

interface BingImageItem {
  bot: number
  copyright: string //  "汉密尔顿山顶的利克天文台，美国加利福尼亚州 (© Jeffrey Lewis/Tandem Stills + Motion)"
  copyrightlink: string // "https://www.bing.com/search?q=%E5%88%A9%E5%85%8B%E5%A4%A9%E6%96%87%E5%8F%B0&form=hpcapt&mkt=zh-cn"
  drk: number
  enddate: string // "20220103"
  fullstartdate: string // "202201021600"
  hs: any[]
  hsh: string // "c1b40e3cedfe095004365a5d610cdd95"
  quiz: string // "/search?q=Bing+homepage+quiz&filters=WQOskey:%22HPQuiz_20220102_LickObservatory%22&FORM=HPQUIZ"
  startdate: string // "20220102"
  title: string // ""
  top: number
  url: string // "/th?id=OHR.LickObservatory_ZH-CN9676762110_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp"
  urlbase: string // "/th?id=OHR.LickObservatory_ZH-CN9676762110"
  wp: boolean
}

type NewsSources = 'toutiao' | 'baidu' | 'zhihu' | 'weibo' | 'kr36' | 'bilibili' | 'v2ex'

interface NewsListItem {
  url: string
  desc: string
  hot: string
  cover?: string
}
