<template>
  <div v-if="globalState.setting.clock.enabled" id="clock">
    <div class="clock__container" :style="containerStyle">
      <div class="clock__time">
        <p class="time__text">
          {{ state.time }}
        </p>
        <span v-if="globalState.setting.clock.unitEnabled" class="time__unit">{{ state.unit }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { globalState, getLayoutStyle, formatNumWithPixl } from '@/logic'

const CNAME = 'clock'

const state = reactive({
  time: '',
  unit: '',
})
const updateTime = () => {
  state.time = dayjs().format(globalState.setting.clock.format)
  state.unit = dayjs().format('a')
}

updateTime()

const timer = setInterval(updateTime, 1000)

onUnmounted(() => {
  clearInterval(timer)
})

const positionStyle = computed(() => getLayoutStyle(CNAME))

const containerStyle = computed(() => {
  let style = ''
  if (globalState.style.clock.isShadowEnabled) {
    style += `text-shadow: 2px 8px 6px ${globalState.style.clock.shadowColor[globalState.localState.currThemeCode]};`
  }
  return style + positionStyle.value
})

const customFontSize = computed(() => formatNumWithPixl(CNAME, 'fontSize'))
const customUnitFontSize = computed(() => formatNumWithPixl(CNAME, 'unit', 'fontSize'))
const customLetterSpacing = computed(() => formatNumWithPixl(CNAME, 'letterSpacing'))

</script>

<style scoped>
#clock {
  font-family: v-bind(globalState.style.clock.fontFamily);
  color: v-bind(globalState.style.clock.fontColor[globalState.localState.currThemeCode]);
  user-select: none;
  .clock__container {
    position: fixed;
    text-align: center;
    transition: all 0.3s ease;
    .clock__time {
      display: flex;
      justify-content: center;
      align-items: baseline;
      .time__text {
        font-size: v-bind(customFontSize);
        letter-spacing: v-bind(customLetterSpacing);
      }
      .time__unit {
        font-size: v-bind(customUnitFontSize);
      }
    }
  }
}
</style>
