<template>
  <div v-if="globalState.setting.date.enabled" id="weather">
    <div class="weather__container" :style="containerStyle">
      <CurrentWeather />
      <ForecastWeather />
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import CurrentWeather from './CurrentWeather.vue'
import ForecastWeather from './ForecastWeather.vue'
import { WEATHER_LANG_MAP, log, globalState, getLayoutStyle, formatNumWithPixl } from '@/logic'
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
  globalState.localState.weather.current = data.current
  globalState.localState.weather.forecastday = data.forecast.forecastday
  log('Update forecast weather')
}

const updateData = () => {
  if (!globalState.setting.date.enabled) {
    return
  }
  const currTS = dayjs().unix()
  if (globalState.setting.weather.forecastEnabled
    && (currTS - globalState.localState.weather.current.last_updated_epoch > 3600 * 4)
  ) {
    getForecastData()
    return
  }
  if (currTS - globalState.localState.weather.current.last_updated_epoch < 3600) {
    return
  }
  getCurrentData()
}

onMounted(() => {
  updateData()
})

// 开启“预报”后立即更新数据
watch(() => globalState.setting.weather.forecastEnabled, (value) => {
  if (!value) {
    return
  }
  getForecastData()
})

const positionStyle = computed(() => getLayoutStyle(CNAME))

const containerStyle = computed(() => {
  return positionStyle.value
})

const customFontSize = computed(() => formatNumWithPixl(CNAME, 'fontSize'))
</script>

<style scoped>
#weather {
  font-family: v-bind(globalState.style.weather.fontFamily);
  color: v-bind(globalState.style.weather.fontColor[globalState.localState.currThemeCode]);
  user-select: none;
  .weather__container {
    position: fixed;
    text-align: center;
    transition: all 0.3s ease;
    font-size: v-bind(customFontSize);
  }
}
</style>
