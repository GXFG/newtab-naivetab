<script setup lang="ts">
import { getIsWidgetRender, getStyleField } from '@/logic/store'
import { updateWeather, refreshWeather } from '@/newtab/widgets/weather/logic'
import WidgetWrap from '../WidgetWrap.vue'
import NowWeather from './NowWeather.vue'
import ForecastWeather from './ForecastWeather.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

onMounted(() => {
  updateWeather()
})

// 开启主开关后立即更新数据
watch(isRender, (value) => {
  if (!value) {
    return
  }
  refreshWeather()
})

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'px')
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="weather__container"
    >
      <NowWeather />
      <ForecastWeather />
    </div>
  </WidgetWrap>
</template>

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
