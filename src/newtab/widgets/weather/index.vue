<script setup lang="ts">
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import {
  updateWeather,
  refreshWeather,
  handleWatchWeatherConfigChange,
} from '@/newtab/widgets/weather/logic'
import WidgetWrap from '../WidgetWrap.vue'
import NowWeather from './NowWeather.vue'
import ForecastWeather from './ForecastWeather.vue'
import { WIDGET_CODE } from './config'

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'px')

const weatherStyle = computed(() => ({
  '--nt-w-font-family': customFontFamily.value,
  '--nt-w-font-color': customFontColor.value,
  '--nt-w-font-size': customFontSize.value,
}))

const isRender = getIsWidgetRender(WIDGET_CODE)

let weatherConfigChangeHandle: ReturnType<
  typeof handleWatchWeatherConfigChange
> | null = null

onMounted(() => {
  updateWeather()
  weatherConfigChangeHandle = handleWatchWeatherConfigChange()
})

onUnmounted(() => {
  if (weatherConfigChangeHandle) {
    weatherConfigChangeHandle()
  }
})

// 开启主开关后立即更新数据
watch(isRender, (value) => {
  if (!value) {
    return
  }
  refreshWeather()
})
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="weather__container"
      :style="weatherStyle"
    >
      <NowWeather />
      <ForecastWeather />
    </div>
  </WidgetWrap>
</template>

<style>
#weather {
  user-select: none;
  .weather__container {
    z-index: 10;
    position: absolute;
    text-align: center;
    font-family: var(--nt-w-font-family);
    color: var(--nt-w-font-color);
    font-size: var(--nt-w-font-size);
  }
}
</style>
