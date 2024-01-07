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

type DatabaseHandleType = 'add' | 'put' | 'get' | 'delete'
type DatabaseStore = 'localBackgroundImages' | 'currBackgroundImages'

type OptionsPermission = 'bookmarks'

type TargetType = 1 | 2 // 1:component 2:element
type Components = 'bookmark' | 'clockDigital' | 'clockAnalog' | 'date' | 'calendar' | 'search' | 'weather' | 'memo' | 'news'
type ConfigField = Components | 'general'
type Placement = 'top' | 'bottom' | 'left' | 'right'

interface SelectStringItem {
  label: string
  value: string
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

type NewsSources = 'toutiao' | 'baidu' | 'zhihu' | 'weibo' | 'kr36' | 'bilibili' | 'v2ex'

interface NewsListItem {
  url: string
  desc: string
  hot: string
  cover?: string
}
