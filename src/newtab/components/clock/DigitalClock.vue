<template>
  <div v-if="globalState.setting.clock.enabled" id="clock" :style="positionStyle">
    <div class="clock__time">
      <p class="time__text">
        {{ state.time }}
      </p>
      <span class="time__mid">{{ state.mid }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { globalState, getLayoutStyle, getCustomFontSize } from '@/logic'

const state = reactive({
  time: '',
  mid: '',
})

const updateTime = () => {
  state.time = dayjs().format('hh:mm:ss')
  state.mid = dayjs().format('a')
}
updateTime()

const timer = setInterval(updateTime, 1000)

onUnmounted(() => {
  clearInterval(timer)
})

const positionStyle = computed(() => getLayoutStyle('clock'))

const customFontSize = computed(() => getCustomFontSize('clock'))

</script>

<style scoped>
#clock {
  position: fixed;
  font-family: v-bind(globalState.setting.clock.style.fontFamily);
  color: v-bind(globalState.setting.clock.style.fontColor[globalState.localState.currThemeCode]);
  text-align: center;
  text-shadow: 2px 8px 6px var(--shadow-watch-a),
    0px -5px 35px var(--shadow-watch-b);
  user-select: none;
  transition: all 0.3s ease;
  .clock__time {
    display: flex;
    align-items: baseline;
    .time__text {
      font-size: v-bind(customFontSize);
    }
    .time__mid {
      font-size: v-bind(customFontSize);
    }
  }
}
</style>
