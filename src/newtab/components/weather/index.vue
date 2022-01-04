<template>
  <Moveable componentName="weather" @onDrag="(style) => (containerStyle = style)">
    <div v-if="globalState.setting.weather.enabled" id="weather" data-cname="weather">
      <div class="weather__container" :style="containerStyle">
        <CurrentWeather />
        <ForecastWeather />
      </div>
    </div>
  </Moveable>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import CurrentWeather from './CurrentWeather.vue'
import ForecastWeather from './ForecastWeather.vue'
import { WEATHER_LANG_MAP, log, globalState, getLayoutStyle, getStyleField } from '@/logic'
import http from '@/lib/http'

const CNAME = 'weather'

const getCurrentData = async() => {
  const data: any = await http({
    url: 'https://api.weatherapi.com/v1/current.json',
    params: {
      key: globalState.setting.weather.apiKey,
      q: globalState.setting.weather.city.value,
      aqi: globalState.setting.weather.aqi,
      lang: WEATHER_LANG_MAP[globalState.setting.general.lang],
    },
  })
  globalState.localState.weather.syncTime = dayjs().valueOf()
  globalState.localState.weather.current = data.current
  log('Update current weather')
}

const getForecastData = async() => {
  const data: any = await http({
    url: 'https://api.weatherapi.com/v1/forecast.json',
    params: {
      key: globalState.setting.weather.apiKey,
      q: globalState.setting.weather.city.value,
      aqi: globalState.setting.weather.aqi,
      alerts: 'no',
      days: 5,
      lang: WEATHER_LANG_MAP[globalState.setting.general.lang],
    },
  })
  globalState.localState.weather.syncTime = dayjs().valueOf()
  globalState.localState.weather.current = data.current
  globalState.localState.weather.forecastday = data.forecast.forecastday
  log('Update forecast weather')
}

const updateData = () => {
  if (!globalState.setting.date.enabled) {
    return
  }
  const currTS = dayjs().unix()
  if (globalState.setting.weather.forecastEnabled && currTS - globalState.localState.weather.syncTime > 3600000 * 4) {
    getForecastData()
    return
  }
  if (currTS - globalState.localState.weather.syncTime < 3600000) {
    return
  }
  getCurrentData()
}

onMounted(() => {
  updateData()
})

// 修改城市后立即更新数据
watch(
  () => globalState.setting.weather.city.value,
  () => {
    getForecastData()
  },
)

// 开启“预报”后立即更新数据
watch(
  () => globalState.setting.weather.forecastEnabled,
  (value) => {
    if (!value) {
      return
    }
    getForecastData()
  },
)

const containerStyle = ref(getLayoutStyle(CNAME))
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
</script>

<style scoped>
#weather {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  user-select: none;
  .weather__container {
    position: absolute;
    text-align: center;
    font-size: v-bind(customFontSize);
  }
}
</style>
