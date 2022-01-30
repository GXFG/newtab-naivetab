<template>
  <MoveableComponentWrap componentName="weather" @drag="(style) => (dragStyle = style)">
    <div v-if="isRender" id="weather" data-target-type="1" data-target-name="weather">
      <div class="weather__container" :style="dragStyle || containerStyle">
        <NowWeather />
        <ForecastWeather />
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<script setup lang="ts">
import NowWeather from './NowWeather.vue'
import ForecastWeather from './ForecastWeather.vue'
import { getIsComponentRender, getLayoutStyle, getStyleField, updateWeather, refreshWeather } from '@/logic'

const CNAME = 'weather'
const isRender = getIsComponentRender(CNAME)

onMounted(() => {
  updateWeather()
})

// 开启天气主开关后立即更新数据
watch(isRender, (value) => {
  if (!value) {
    return
  }
  refreshWeather()
})

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
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
