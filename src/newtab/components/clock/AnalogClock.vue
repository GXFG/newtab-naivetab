<template>
  <MoveableComponentWrap componentName="clockAnalog" @drag="(style) => (dragStyle = style)">
    <div v-if="isRender" id="analog-clock" data-target-type="1" data-target-name="clockAnalog">
      <div class="clockAnalog__container" :style="dragStyle || containerStyle">
        <div v-show="state.isClockVisible" class="container__clock" :style="`background-image: url(/assets/img/clock/${currTheme}/background.png);`">
          <div class="clock__base clock__base--animation" :style="`background-image: url(/assets/img/clock/${currTheme}/marker.png);`" />
          <div
            class="clock__base clock__hour"
            :class="{ 'clock__base--animation': state.isAnimationEnable && state.isHourAnimationEnable }"
            :style="`background-image: url(/assets/img/clock/${currTheme}/hour.png);`"
          />
          <div
            class="clock__base clock__minute"
            :class="{ 'clock__base--animation': state.isAnimationEnable && state.isMinuteAnimationEnable }"
            :style="`background-image: url(/assets/img/clock/${currTheme}/minute.png);`"
          />
          <div
            class="clock__base clock__second"
            :class="{ 'clock__base--animation': state.isAnimationEnable && state.isSecondAnimationEnable }"
            :style="`background-image: url(/assets/img/clock/${currTheme}/second.png);`"
          />
        </div>
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<script setup lang="ts">
import { ANALOG_CLOCK_THEME, addTimerTask, removeTimerTask, localConfig, getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic'

const CNAME = 'clockAnalog'
const isRender = getIsComponentRender(CNAME)

const currTheme = computed(() => ANALOG_CLOCK_THEME.find(item => item.value === localConfig.clockAnalog.theme)?.label || 'light')

const state = reactive({
  isAnimationEnable: true,
  isHourAnimationEnable: true,
  isMinuteAnimationEnable: true,
  isSecondAnimationEnable: true,
  isClockVisible: false,
  hourDeg: 0,
  minuteDeg: 0,
  secondDeg: 0,
})

const imageLoadComplete = (url: string) => {
  return new Promise((resolve) => {
    const imgEle = new Image()
    imgEle.src = url
    imgEle.onload = () => {
      resolve(true)
    }
    imgEle.onerror = () => {
      resolve(true)
    }
  })
}

const getClockImageUrl = (type: 'background' | 'marker' | 'hour' | 'minute' | 'second') => {
  return `/assets/img/clock/${currTheme.value}/${type}.png`
}

const initClockImage = async() => {
  const url = getClockImageUrl('background')
  await imageLoadComplete(url)
  state.isClockVisible = true
}

initClockImage()

const DISABLE_ANIMATION_DELAY_TIME = 350 // 需要大于动画执行时间300ms
const ENABLE_ANIMATION_DELAY_TIME = 500

const updateTime = () => {
  const date = new Date()
  const h = date.getHours()
  const m = date.getMinutes()
  const s = date.getSeconds()
  if (s !== 0) {
    state.secondDeg = s * 6
    state.minuteDeg = m * 6
    state.hourDeg = h * 30 + m * 0.5
    return
  }
  state.secondDeg = 360
  setTimeout(() => {
    state.isSecondAnimationEnable = false
    state.secondDeg = 0
  }, DISABLE_ANIMATION_DELAY_TIME)
  setTimeout(() => {
    state.isSecondAnimationEnable = true
  }, ENABLE_ANIMATION_DELAY_TIME)

  if (m !== 0) {
    state.minuteDeg = m * 6
    return
  }
  state.minuteDeg = 360
  setTimeout(() => {
    state.isMinuteAnimationEnable = false
    state.minuteDeg = 0
  }, DISABLE_ANIMATION_DELAY_TIME)
  setTimeout(() => {
    state.isMinuteAnimationEnable = true
  }, ENABLE_ANIMATION_DELAY_TIME)

  if (h !== 0) {
    state.hourDeg = h * 30
    return
  }
  state.hourDeg = 360
  setTimeout(() => {
    state.isHourAnimationEnable = false
    state.hourDeg = 0
  }, DISABLE_ANIMATION_DELAY_TIME)
  setTimeout(() => {
    state.isHourAnimationEnable = true
  }, ENABLE_ANIMATION_DELAY_TIME)
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(CNAME)
      return
    }
    addTimerTask(CNAME, updateTime)
  },
  { immediate: true },
)

// page切换后台时隐藏动画，避免后续页面可见时指针动画执行过多
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    state.isAnimationEnable = false
  } else {
    setTimeout(() => {
      state.isAnimationEnable = true
    }, ENABLE_ANIMATION_DELAY_TIME)
  }
})

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
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
      background-size: 100%;
      .clock__base {
        position: absolute;
        top: 0;
        left: 0;
        height: v-bind(customWidth);
        width: v-bind(customWidth);
        border-radius: 50%;
        background-size: 100%;
      }
      .clock__base--animation {
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
