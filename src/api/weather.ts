import request from '@/lib/request'
import { WEATHER_LANG_MAP } from '@/logic/const'
import { localConfig } from '@/logic/store'

// https://dev.qweather.com/docs/api/geo/city-lookup/
export const getCityLookup = (
  location: string,
): Promise<{
  code: string
  location: CityItem[]
}> => {
  return request({
    url: 'https://geoapi.qweather.com/v2/city/lookup',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location,
    },
  })
}

// https://dev.qweather.com/docs/api/weather/weather-daily-forecast/
export const getWeatherForecast = (): Promise<{
  code: string
  daily: ForecastItem[]
}> => {
  return request({
    url: 'https://devapi.qweather.com/v7/weather/3d',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location: localConfig.weather.city.id,
    },
  })
}

// https://dev.qweather.com/docs/api/weather/weather-now/
export const getWeatherNow = (): Promise<{
  code: string
  now: {
    cloud: string // "0"
    dew: string // "-20"
    feelsLike: string // "-2"
    humidity: string // "22"
    icon: string // "100"
    obsTime: string // "2022-01-29T11:13+08:00"
    precip: string // "0.0"
    pressure: string // "1024"
    temp: string // "2"
    text: string // "晴"
    vis: string // "30"
    wind360: string // "0"
    windDir: string // "北风"
    windScale: string // "2"
    windSpeed: string // "7"
  }
}> => {
  return request({
    url: 'https://devapi.qweather.com/v7/weather/now',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location: localConfig.weather.city.id,
    },
  })
}

// https://dev.qweather.com/docs/api/indices/
export const getWeatherIndices = () => {
  return request({
    url: 'https://devapi.qweather.com/v7/indices/1d',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location: localConfig.weather.city.id,
      type: '1,3,7,8,10',
    },
  })
}

// https://dev.qweather.com/docs/api/air/air-now/
export const getWeatherAirNow = (): Promise<{
  code: string
  now: {
    aqi: string // "31"
    category: string // "优"
    co: string // "0.3"
    level: string // "1"
    no2: string // "15"
    o3: string // "64"
    pm2p5: string // "20"
    pm10: string // "31"
    primary: string // "NA"
    pubTime: string // "2022-01-29T15:00+08:00"
    so2: string // "1"
  }
}> => {
  return request({
    url: 'https://devapi.qweather.com/v7/air/now',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location: localConfig.weather.city.id,
    },
  })
}

// https://dev.qweather.com/docs/api/warning/weather-warning/
export const getWeatherWarning = (): Promise<{
  code: string
  warning: WarningItem[]
}> => {
  return request({
    url: 'https://devapi.qweather.com/v7/warning/now',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location: localConfig.weather.city.id,
    },
  })
}
