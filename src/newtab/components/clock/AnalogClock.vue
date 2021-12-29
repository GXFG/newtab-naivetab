<template>
  <Moveable componentName="clockAnalog" @onDrag="(style) => (containerStyle = style)">
    <div v-if="globalState.setting.clockAnalog.enabled" id="analog-clock" data-cname="clockAnalog">
      <div class="clockAnalog__container" :style="containerStyle">
        <article class="clock" :style="`background-image: url(/assets/img/clock/${currTheme}/background.png);`">
          <div class="base marker" :style="`background-image: url(/assets/img/clock/${currTheme}/marker.png);`"></div>
          <div class="base hour" :style="`transform: rotateZ(${state.hourDeg}deg);background-image: url(/assets/img/clock/${currTheme}/hour.png)`"></div>
          <div class="base minute" :style="`transform: rotateZ(${state.minuteDeg}deg);background-image: url(/assets/img/clock/${currTheme}/minute.png)`"></div>
          <div class="base second" :style="`transform: rotateZ(${state.secondDeg}deg);background-image: url(/assets/img/clock/${currTheme}/second.png)`"></div>
        </article>
      </div>
    </div>
  </Moveable>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ANALOG_CLOCK_THEME, addTimerTask, removeTimerTask, globalState, getLayoutStyle, formatNumWithPixl } from '@/logic'

const CNAME = 'clockAnalog'

const state = reactive({
  hourDeg: 0,
  minuteDeg: 0,
  secondDeg: 0,
})

const initTime = () => {
  const h = dayjs().hour()
  const m = dayjs().minute()
  const s = dayjs().second()
  state.hourDeg = h * 30
  state.minuteDeg = m * 6
  state.secondDeg = s * 6
}

const updateTime = () => {
  const s = dayjs().second()
  const m = dayjs().minute()
  state.secondDeg += 6
  if (s !== 0) {
    return
  }
  state.minuteDeg += 6
  if (m !== 0) {
    return
  }
  state.hourDeg += 30
}

watch(
  () => globalState.setting.clockAnalog.enabled,
  (value) => {
    if (value) {
      initTime()
      addTimerTask(CNAME, updateTime)
    } else {
      removeTimerTask(CNAME)
    }
  },
  { immediate: true },
)

const currTheme = computed(() => ANALOG_CLOCK_THEME.find(item => item.value === globalState.setting.clockAnalog.theme)?.label || 'light')

const containerStyle = ref(getLayoutStyle(CNAME))
const customWidth = computed(() => formatNumWithPixl(CNAME, 'width'))
</script>

<style scoped>
/* https://cssanimation.rocks/clocks/ */
#analog-clock {
  user-select: none;
  .clockAnalog__container {
    position: absolute;
    text-align: center;
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
