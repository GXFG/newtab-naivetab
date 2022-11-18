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

interface ForecastItem {
  cloud: string // "25"
  fxDate: string // "2022-03-01"
  humidity: string // "29"
  iconDay: string // "100"
  iconNight: string // "150"
  moonPhase: string // "残月"
  moonPhaseIcon: string // "807"
  moonrise: string // "06:16"
  moonset: string // "16:17"
  precip: string // "0.0"
  pressure: string // "1013"
  sunrise: string // "06:49"
  sunset: string // "18:05"
  tempMax: string // "12"
  tempMin: string // "-3"
  textDay: string // "晴"
  textNight: string // "晴"
  uvIndex: string // "4"
  vis: string // "25"
  wind360Day: string // "225"
  wind360Night: string // "225"
  windDirDay: string // "西南风"
  windDirNight: string // "西南风"
  windScaleDay: string // "1-2"
  windScaleNight: string // "1-2"
  windSpeedDay: string // "3"
  windSpeedNight: string // "3"
}
