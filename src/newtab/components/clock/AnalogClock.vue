<template>
  <MoveableComponentWrap componentName="clockAnalog" @drag="(style) => (containerStyle = style)">
    <div v-if="isRender" id="analog-clock" data-target-type="1" data-target-name="clockAnalog">
      <div class="clockAnalog__container" :style="containerStyle">
        <article class="container__clock" :style="`background-image: url(/assets/img/clock/${currTheme}/background.png);`">
          <div class="clock__base" :style="`background-image: url(/assets/img/clock/${currTheme}/marker.png);`" />
          <div class="clock__base clock__hour" :style="`background-image: url(/assets/img/clock/${currTheme}/hour.png);`" />
          <div class="clock__base clock__minute" :style="`);background-image: url(/assets/img/clock/${currTheme}/minute.png);`" />
          <div class="clock__base clock__second" :style="`background-image: url(/assets/img/clock/${currTheme}/second.png);`" />
        </article>
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<script setup lang="ts">
import { ANALOG_CLOCK_THEME, addTimerTask, removeTimerTask, globalState, getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic'

const CNAME = 'clockAnalog'
const isRender = getIsComponentRender(CNAME)

const state = reactive({
  hourDeg: 0,
  minuteDeg: 0,
  secondDeg: 0,
})

const initTime = () => {
  const h = dayjs().hour()
  const m = dayjs().minute()
  const s = dayjs().second()
  state.hourDeg = h * 30 + m * 0.5
  state.minuteDeg = m * 6
  state.secondDeg = s * 6
}

const updateTime = () => {
  const s = dayjs().second()
  state.secondDeg += 6
  if (s !== 0) {
    return
  }
  state.minuteDeg += 6
  state.hourDeg += 0.5
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(CNAME)
      return
    }
    initTime()
    addTimerTask(CNAME, updateTime)
  },
  { immediate: true },
)

const currTheme = computed(() => ANALOG_CLOCK_THEME.find(item => item.value === globalState.setting.clockAnalog.theme)?.label || 'light')

const containerStyle = ref(getLayoutStyle(CNAME))
const customWidth = getStyleField(CNAME, 'width', 'px')
const hourDeg = computed(() => `${state.hourDeg}deg`)
const minuteDeg = computed(() => `${state.minuteDeg}deg`)
const secondDeg = computed(() => `${state.secondDeg}deg`)
</script>

<style scoped>
/* https://cssanimation.rocks/clocks/ */
#analog-clock {
  user-select: none;
  .clockAnalog__container {
    z-index: 10;
    position: absolute;
    text-align: center;
    .container__clock {
      position: relative;
      height: v-bind(customWidth);
      width: v-bind(customWidth);
      border-radius: 20%;
      background-size: 100%;
      .clock__base {
        position: absolute;
        top: 0;
        left: 0;
        height: v-bind(customWidth);
        width: v-bind(customWidth);
        border-radius: 50%;
        background-size: 100%;
        transition: transform 0.3s cubic-bezier(0.4, 2.08, 0.55, 0.44);
      }
      .clock__hour {
        transform: rotateZ(v-bind(hourDeg));
      }
      .clock__minute {
        transform: rotateZ(v-bind(minuteDeg));
      }
      .clock__second {
        transform: rotateZ(v-bind(secondDeg));
      }
    }
  }
}
</style>
