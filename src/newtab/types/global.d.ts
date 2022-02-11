interface Window {
  _gaq: any
  $t: any // vue-i18n
  $message: any
  $notification: any
}

type TargetType = 1 | 2 // 1:component 2:element
type Components = 'settingIcon' | 'bookmark' | 'clockDigital' | 'clockAnalog' | 'date' | 'calendar' | 'search' | 'weather' | 'memo'

interface SelectStringItem {
  label: string
  value: string
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

interface ImageListItem {
  id: string
  url: string
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

interface CityItem {
  adm1: string // "北京市"
  adm2: string // "北京"
  country: string // "中国"
  fxLink: string // "http://hfx.link/2ax1"
  id: string // "101010100"
  isDst: string // "0"
  lat: string // "39.90498"
  lon: string // "116.40528"
  name: string // "北京"
  rank: string // "10"
  type: string // "city"
  tz: string // "Asia/Shanghai"
  utcOffset: string // "+08:00"
}

interface IndicesItem {
  category: string // "较不宜"
  date: string // "2022-01-29"
  level: string // "3"
  name: string // "运动指数"
  text: string // "天气较好，但考虑天气寒冷，推荐您进行室内运动，户外运动时请注意保暖并做好准备活动。"
  type: string // "1"
}

interface WarningItem {
  id: string // "10101010020211009154607668935939",
  sender: string // "北京市气象局",
  pubTime: string // "2021-10-09T15:46+08:00",
  title: string // "北京市气象台2021年10月09日15时40分发布大风蓝色预警信号",
  startTime: string // "2021-10-09T15:40+08:00",
  endTime: string // "2021-10-10T15:40+08:00",
  status: string // "active",
  level: string // "蓝色",
  type: string // "11B06",
  typeName: string // "大风",
  text: string // "市气象台2021年10月9日15时40分发布大风蓝色预警信号：预计，9日22时至10日19时，本市大部分地区有4级左右偏北风，阵风6、7级，山区阵风可达8级左右，请注意防范。",
  related: string // ""
}
