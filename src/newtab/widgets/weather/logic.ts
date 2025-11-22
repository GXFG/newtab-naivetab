import { useStorageLocal } from '@/composables/useStorageLocal'
import { getWeatherNow, getWeatherForecast, getWeatherAirNow, getWeatherWarning } from '@/api'
import { log } from '@/logic/util'
import { localConfig } from '@/logic/store'

const defaultWeatherState = {
  state: { isWarningVisible: false },
  now: { syncTime: 0, cloud: '', dew: '', feelsLike: '', humidity: '', icon: '', obsTime: '', precip: '', pressure: '', temp: '', text: '', vis: '', wind360: '', windDir: '', windScale: '', windSpeed: '' },
  air: { syncTime: 0, aqi: '', category: '', co: '', level: '', no2: '', o3: '', pm2p5: '', pm10: '', primary: '', pubTime: '', so2: '' },
  indices: { syncTime: 0, list: [] as IndicesItem[] },
  warning: { syncTime: 0, list: [] as WarningItem[] },
  forecast: { syncTime: 0, list: [] as ForecastItem[] },
}

export const weatherState = useStorageLocal('data-weather', defaultWeatherState)

export const weatherIndicesInfo = computed(() => weatherState.value.indices.list.map((item: IndicesItem) => `${item.name}:【${item.category}】 ${item.text}`.replace(/\n/, '')).join('\n'))
export const weatherWarningInfo = computed(() => weatherState.value.warning.list.map((item: WarningItem) => `☞ ${item.text}`.replace(/\n/, '')).join('\n'))

const getNowData = async () => {
  const data = await getWeatherNow()
  if (data.code !== '200') return
  weatherState.value.now = { syncTime: dayjs().valueOf(), ...data.now }
  log('Weather update now')
}
const getForecastData = async () => {
  const data = await getWeatherForecast()
  if (data.code !== '200') return
  weatherState.value.forecast.list = data.daily
  weatherState.value.forecast.syncTime = dayjs().valueOf()
  log('Weather update forecast')
}
const getAirData = async () => {
  const data = await getWeatherAirNow()
  if (data.code !== '200') return
  weatherState.value.air = { syncTime: dayjs().valueOf(), ...data.now }
  log('Weather update air')
}
const getWarningData = async () => {
  const data = await getWeatherWarning()
  if (data.code !== '200') return
  weatherState.value.warning = { syncTime: dayjs().valueOf(), list: data.warning }
  weatherState.value.state.isWarningVisible = !!(data.warning && data.warning.length && data.warning.length !== 0)
  log('Weather update warning')
}

export const updateWeather = () => {
  if (!localConfig.weather.enabled) return
  const currTS = dayjs().valueOf()
  if (currTS - weatherState.value.now.syncTime >= 3600000 * 1) getNowData()
  if (currTS - weatherState.value.air.syncTime >= 3600000 * 4) getAirData()
  if (currTS - weatherState.value.warning.syncTime >= 3600000 * 1) getWarningData()
  if (currTS - weatherState.value.forecast.syncTime >= 3600000 * 4) getForecastData()
}
export const refreshWeather = () => {
  getNowData()
  getAirData()
  getWarningData()
  getForecastData()
}
export const handleWatchWeatherConfigChange = () => {
  watch([() => localConfig.weather.city.id, () => localConfig.general.lang], () => refreshWeather())
}
