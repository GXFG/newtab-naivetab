interface Window {
  _gaq: any
  $t: any // vue-i18n
  $message: any
  $notification: any
}

type TComponents = 'general' | 'bookmark' | 'clockDigital' | 'clockAnalog' | 'date' | 'calendar' | 'weather'

type TEnum = {
  label: string
  value: number
}

type TSelectItem = {
  label: string
  value: string
}

type TCalendar = {
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

type TImageItem = {
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

type TWeatherCurrentItem = {
  time_epoch: number // 1638460800,
  time: string // "2021-12-03 00:00",
  temp_c: number // 6.4,
  temp_f: number // 43.5,
  is_day: number // 0,
  condition: {
    text: string // "Clear",
    icon: string // "//cdn.weatherapi.com/weather/64x64/night/113.png",
    code: number // 1000
  }
  wind_mph: number // 9.8,
  wind_kph: number // 15.8,
  wind_degree: number // 321,
  wind_dir: string // "NW",
  pressure_mb: number // 1021.0,
  pressure_in: number // 30.15,
  precip_mm: number // 0.0,
  precip_in: number // 0.0,
  humidity: number // 27,
  cloud: number // 4,
  feelslike_c: number // 3.4,
  feelslike_f: number // 38.1,
  windchill_c: number // 3.4,
  windchill_f: number // 38.1,
  heatindex_c: number // 6.4,
  heatindex_f: number // 43.5,
  dewpoint_c: number // -11.2,
  dewpoint_f: number // 11.8,
  will_it_rain: number // 0,
  chance_of_rain: number // 0,
  will_it_snow: number // 0,
  chance_of_snow: number // 0,
  vis_km: number // 10.0,
  vis_miles: number // 6.0,
  gust_mph: number // 15.9,
  gust_kph: number // 25.6,
  uv: number // 1.0
}

type TWeatherForecastdayItem = {
  date: string
  date_epoch: string
  day: {
    maxtemp_c: number // 13.4,
    maxtemp_f: number // 56.1,
    mintemp_c: number // 4.8,
    mintemp_f: number // 40.6,
    avgtemp_c: number // 7.9,
    avgtemp_f: number // 46.2,
    maxwind_mph: number // 9.8,
    maxwind_kph: number // 15.8,
    totalprecip_mm: number // 0.0,
    totalprecip_in: number // 0.0,
    avgvis_km: number // 10.0,
    avgvis_miles: number // 6.0,
    avghumidity: number // 26.0,
    daily_will_it_rain: number // 0,
    daily_chance_of_rain: number // 0,
    daily_will_it_snow: number // 0,
    daily_chance_of_snow: number // 0,
    condition: {
      text: string // "Sunny",
      icon: string // "//cdn.weatherapi.com/weather/64x64/day/113.png",
      code: number // 1000
    }
    uv: number
  }
  astro: {
    sunrise: string // "07:19 AM",
    sunset: string // "04:50 PM",
    moonrise: string // "05:42 AM",
    moonset: string // "03:58 PM",
    moon_phase: string // "Waxing Crescent",
    moon_illumination: string // "0"
  }
  hour: TWeatherCurrentItem[]
}
