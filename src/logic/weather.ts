import { useStorageLocal } from '@/composables/useStorageLocal'
import { getWeatherNow, getWeatherForecast, getWeatherIndices, getWeatherAirNow, getWeatherWarning } from '@/api'
import { globalState, log } from '@/logic'

export const weatherState = ref(useStorageLocal('data-weather', {
  now: {
    syncTime: 0,
    cloud: '', // "0"
    dew: '', // "-20"
    feelsLike: '', // "-2"
    humidity: '', // "22"
    icon: '', // "100"
    obsTime: '', // "2022-01-29T11:13+08:00"
    precip: '', // "0.0"
    pressure: '', // "1024"
    temp: '', // "2"
    text: '', // "晴"
    vis: '', // "30"
    wind360: '', // "0"
    windDir: '', // "北风"
    windScale: '', // "2"
    windSpeed: '', // "7"
  },
  air: {
    syncTime: 0,
    aqi: '', // "31"
    category: '', // "优"
    co: '', // "0.3"
    level: '', // "1"
    no2: '', // "15"
    o3: '', // "64"
    pm2p5: '', // "20"
    pm10: '', // "31"
    primary: '', // "NA"
    pubTime: '', // "2022-01-29T15:00+08:00"
    so2: '', // "1"
  },
  indices: {
    syncTime: 0,
    list: [] as IndicesItem[],
  },
  warning: {
    syncTime: 0,
    list: [] as WarningItem[],
  },
  forecast: {
    syncTime: 0,
    list: [],
  },
}))

const getNowData = async() => {
  const data = await getWeatherNow()
  if (data.code !== '200') {
    return
  }
  weatherState.value.now = data.now
  weatherState.value.now.syncTime = dayjs().valueOf()
  log('Update now weather')
}

const getForecastData = async() => {
  const data = await getWeatherForecast()
  if (data.code !== '200') {
    return
  }
  weatherState.value.forecast.list = data.daily
  weatherState.value.forecast.syncTime = dayjs().valueOf()
  log('Update forecast weather')
}

const getIndicesData = async() => {
  const data = await getWeatherIndices()
  if (data.code !== '200') {
    return
  }
  weatherState.value.indices.list = data.daily
  weatherState.value.indices.syncTime = dayjs().valueOf()
  log('Update indices weather')
}

const getAirData = async() => {
  const data = await getWeatherAirNow()
  if (data.code !== '200') {
    return
  }
  weatherState.value.air = data.now
  weatherState.value.air.syncTime = dayjs().valueOf()
  log('Update air weather')
}

const getWarningData = async() => {
  const data = await getWeatherWarning()
  if (data.code !== '200') {
    return
  }
  weatherState.value.warning.list = data.warning
  weatherState.value.warning.syncTime = dayjs().valueOf()
  log('Update warning weather')
}

export const updateWeather = () => {
  if (!globalState.setting.weather.enabled) {
    return
  }
  const currTS = dayjs().valueOf()
  // 实时天气最小刷新间隔为2分钟
  if (currTS - weatherState.value.now.syncTime >= 60000 * 2) {
    getNowData()
  }
  // 空气质量最小刷新间隔为2小时
  if (currTS - weatherState.value.air.syncTime >= 3600000 * 2) {
    getAirData()
  }
  // 生活指数最小刷新间隔为4小时
  if (currTS - weatherState.value.indices.syncTime >= 3600000 * 4) {
    getIndicesData()
  }
  // 预警最小刷新间隔为3小时
  if (currTS - weatherState.value.warning.syncTime >= 3600000 * 2) {
    getWarningData()
  }
  // 未来预报最小刷新间隔为2小时
  if (globalState.setting.weather.forecastEnabled && currTS - weatherState.value.forecast.syncTime >= 3600000 * 2) {
    getForecastData()
  }
}

export const refreshWeather = () => {
  getNowData()
  getAirData()
  getIndicesData()
  getWarningData()
  if (globalState.setting.weather.forecastEnabled) {
    getForecastData()
  }
}

// 修改城市、切换语言 立即更新数据
watch([() => globalState.setting.weather.city.id, () => globalState.setting.general.lang], () => {
  refreshWeather()
})

// 开启“未来预报”后立即更新数据
watch(
  () => globalState.setting.weather.forecastEnabled,
  (value) => {
    if (!value) {
      return
    }
    getForecastData()
  },
)
