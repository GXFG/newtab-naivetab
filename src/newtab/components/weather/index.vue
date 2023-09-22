<script setup lang="ts">
import { getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic/store'
import { updateWeather, refreshWeather } from '@/logic/weather'
import NowWeather from './NowWeather.vue'
import ForecastWeather from './ForecastWeather.vue'

const CNAME = 'weather'
const isRender = getIsComponentRender(CNAME)

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

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
</script>

<template>
  <MoveableComponentWrap
    v-model:dragStyle="dragStyle"
    component-name="weather"
  >
    <div
      v-if="isRender"
      id="weather"
      data-target-type="1"
      data-target-name="weather"
    >
      <div
        class="weather__container"
        :style="dragStyle || containerStyle"
      >
        <NowWeather />
        <ForecastWeather />
      </div>
    </div>
  </MoveableComponentWrap>
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
