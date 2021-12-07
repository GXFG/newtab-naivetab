<template>
  <div v-if="globalState.setting.clockAnalog.enabled" id="analog-clock">
    <div class="analog__container" :style="containerStyle">
      <article class="clock" :style="`background-image: url(/assets/img/clock/${currTheme}/background.png);`">
        <div class="base marker" :style="`background-image: url(/assets/img/clock/${currTheme}/marker.png);`"></div>
        <div
          class="base hour"
          :style="`transform: rotateZ(${state.hourDeg}deg); background-image: url(/assets/img/clock/${currTheme}/hour.png);`"
        ></div>
        <div
          class="base minute"
          :style="`transform: rotateZ(${state.minuteDeg}deg); background-image: url(/assets/img/clock/${currTheme}/minute.png);`"
        ></div>
        <div
          class="base second"
          :style="`transform: rotateZ(${state.secondDeg}deg); background-image: url(/assets/img/clock/${currTheme}/second.png);`"
        ></div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ANALOG_CLOCK_THEME, globalState, getLayoutStyle, formatNumWithPixl } from '@/logic'

const CNAME = 'clockAnalog'

const state = reactive({
  hourDeg: 0,
  minuteDeg: 0,
  secondDeg: 0,
})

const updateTime = () => {
  const h = dayjs().hour()
  const m = dayjs().minute()
  const s = dayjs().second()
  state.hourDeg = h * 30
  state.minuteDeg = h * 21600 + m * 6
  state.secondDeg = h * 21600 + m * 360 + s * 6
}

updateTime()

const timer = setInterval(updateTime, 1000)

onUnmounted(() => {
  clearInterval(timer)
})

const currTheme = computed(() => ANALOG_CLOCK_THEME.find(item => item.value === globalState.setting.clockAnalog.theme)?.label || 'dark')

const positionStyle = computed(() => getLayoutStyle(CNAME))

const containerStyle = computed(() => {
  return positionStyle.value
})

const customWidth = computed(() => formatNumWithPixl(CNAME, 'width'))
</script>

<style scoped>
/* https://cssanimation.rocks/clocks/ */
#analog-clock {
  .analog__container {
    position: fixed;
    text-align: center;
    transition: all 0.3s ease;
    .clock {
      position: relative;
      height: v-bind(customWidth);
      width: v-bind(customWidth);
      border-radius: 20%;
      background-size: 100%;
    }

    .base {
      position: absolute;
      top: 0;
      left: 0;
      height: v-bind(customWidth);
      width: v-bind(customWidth);
      border-radius: 50%;
      background-size: 100%;
      transition: transform 0.3s cubic-bezier(0.4, 2.08, 0.55, 0.44);
    }
  }
}
</style>
