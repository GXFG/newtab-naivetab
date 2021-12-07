<template>
  <div v-if="globalState.setting.clockDigital.enabled" id="digital-clock">
    <div class="digital__container" :style="containerStyle">
      <div class="clock__time">
        <p class="time__text">
          {{ state.time }}
        </p>
        <span v-if="globalState.setting.clockDigital.unitEnabled" class="time__unit">{{ state.unit }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { globalState, getLayoutStyle, formatNumWithPixl } from '@/logic'

const CNAME = 'clockDigital'

const state = reactive({
  time: '',
  unit: '',
})

const updateTime = () => {
  state.time = dayjs().format(globalState.setting.clockDigital.format)
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
  if (globalState.style.clockDigital.isShadowEnabled) {
    style += `text-shadow: 2px 8px 6px ${globalState.style.clockDigital.shadowColor[globalState.localState.currThemeCode]};`
  }
  return style + positionStyle.value
})

const customFontSize = computed(() => formatNumWithPixl(CNAME, 'fontSize'))
const customUnitFontSize = computed(() => formatNumWithPixl(CNAME, 'unit', 'fontSize'))
const customLetterSpacing = computed(() => formatNumWithPixl(CNAME, 'letterSpacing'))

</script>

<style scoped>
#digital-clock {
  font-family: v-bind(globalState.style.clockDigital.fontFamily);
  color: v-bind(globalState.style.clockDigital.fontColor[globalState.localState.currThemeCode]);
  user-select: none;
  .digital__container {
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
