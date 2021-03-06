import http from '@/lib/http'
import { WEATHER_LANG_MAP, localConfig } from '@/logic'

// https://dev.qweather.com/docs/api/geo/city-lookup/
export const getCityLookup = (location: string) => {
  return http({
    url: 'https://geoapi.qweather.com/v2/city/lookup',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location,
    },
  })
}

// https://dev.qweather.com/docs/api/weather/weather-daily-forecast/
export const getWeatherForecast = () => {
  return http({
    url: 'https://devapi.qweather.com/v7/weather/3d',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location: localConfig.weather.city.id,
    },
  })
}

// https://dev.qweather.com/docs/api/weather/weather-now/
export const getWeatherNow = () => {
  return http({
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
  return http({
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
export const getWeatherAirNow = () => {
  return http({
    url: 'https://devapi.qweather.com/v7/air/now',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location: localConfig.weather.city.id,
    },
  })
}

// https://dev.qweather.com/docs/api/warning/weather-warning/
export const getWeatherWarning = () => {
  return http({
    url: 'https://devapi.qweather.com/v7/warning/now',
    params: {
      lang: WEATHER_LANG_MAP[localConfig.general.lang],
      key: localConfig.weather.apiKey,
      location: localConfig.weather.city.id,
    },
  })
}
