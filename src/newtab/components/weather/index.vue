<template>
  <MoveableComponentWrap componentName="weather" @drag="(style) => (containerStyle = style)">
    <div v-if="isRender" id="weather" data-target-type="1" data-target-name="weather">
      <div class="weather__container" :style="containerStyle">
        <NowWeather />
        <ForecastWeather />
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<script setup lang="ts">
import NowWeather from './NowWeather.vue'
import ForecastWeather from './ForecastWeather.vue'
import { log, globalState, getIsComponentRender, getLayoutStyle, getStyleField, createTab } from '@/logic'
import { getWeatherNow, getWeatherForecast, getWeatherIndices, getWeatherAirNow, getWeatherWarning } from '@/api'

const CNAME = 'weather'
const isRender = getIsComponentRender(CNAME)

const getNowData = async() => {
  const data = await getWeatherNow()
  if (data.code !== '200') {
    return
  }
  globalState.localState.weather.now = data.now
  globalState.localState.weather.now.syncTime = dayjs().valueOf()
  log('Update now weather')
}

const getForecastData = async() => {
  const data = await getWeatherForecast()
  if (data.code !== '200') {
    return
  }
  globalState.localState.weather.forecast.list = data.daily
  globalState.localState.weather.forecast.syncTime = dayjs().valueOf()
  log('Update forecast weather')
}

const getIndicesData = async() => {
  const data = await getWeatherIndices()
  if (data.code !== '200') {
    return
  }
  globalState.localState.weather.indices.list = data.daily
  globalState.localState.weather.indices.syncTime = dayjs().valueOf()
  log('Update indices weather')
}

const getAirData = async() => {
  const data = await getWeatherAirNow()
  if (data.code !== '200') {
    return
  }
  globalState.localState.weather.air = data.now
  globalState.localState.weather.air.syncTime = dayjs().valueOf()
  log('Update air weather')
}

const getWarningData = async() => {
  const data = await getWeatherWarning()
  if (data.code !== '200') {
    return
  }
  globalState.localState.weather.warning.list = data.warning
  globalState.localState.weather.warning.syncTime = dayjs().valueOf()
  log('Update warning weather')
}

const updateData = () => {
  if (!globalState.setting.weather.enabled) {
    return
  }
  const currTS = dayjs().valueOf()
  // 实时天气最小刷新间隔为2分钟
  if (currTS - globalState.localState.weather.now.syncTime >= 60000 * 2) {
    getNowData()
  }
  // 空气质量最小刷新间隔为2小时
  if (currTS - globalState.localState.weather.air.syncTime >= 3600000 * 2) {
    getAirData()
  }
  // 生活指数最小刷新间隔为4小时
  if (currTS - globalState.localState.weather.indices.syncTime >= 3600000 * 4) {
    getIndicesData()
  }
  // 预警最小刷新间隔为3小时
  if (currTS - globalState.localState.weather.warning.syncTime >= 3600000 * 2) {
    getWarningData()
  }
  // 未来预报最小刷新间隔为2小时
  if (globalState.setting.weather.forecastEnabled && currTS - globalState.localState.weather.forecast.syncTime >= 3600000 * 2) {
    getForecastData()
  }
}

onMounted(() => {
  updateData()
})

// 开启天气主开关后立即更新数据
watch(isRender, (value) => {
  if (!value) {
    return
  }
  getNowData()
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

const onRefresh = () => {
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
  onRefresh()
})

const containerStyle = ref(getLayoutStyle(CNAME))
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
</script>

<style>
#weather {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  user-select: none;
  .weather__container {
    z-index: 10;
    position: absolute;
    text-align: center;
    font-size: v-bind(customFontSize);
  }
}
</style>
