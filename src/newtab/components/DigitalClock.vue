<template>
  <div v-if="globalState.setting.clock.enabled" id="clock" :style="positionStyle">
    <div class="clock__time">
      <p class="time__text">
        {{ state.time }}
      </p>
      <span class="time__mid">{{ state.mid }}</span>
    </div>
    <p class="clock__date">
      {{ state.date }}
    </p>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { globalState, getLayoutStyle } from '@/logic'

const positionStyle = computed(() => getLayoutStyle('clock'))

const state = reactive({
  time: '',
  mid: '',
  date: '',
})

const updateTime = () => {
  state.time = dayjs().format('hh:mm:ss')
  state.mid = dayjs().format('a')
  state.date = dayjs().format('YYYY-MM-DD dddd')
}
updateTime()

const timer = setInterval(updateTime, 1000)

onUnmounted(() => {
  clearInterval(timer)
})

</script>

<style scoped>
#clock {
  position: fixed;
  font-family: "Arial Rounded MT Bold", "Rockwell", "Andale Mono", monospace;
  color: var(--text-color-watch);
  text-align: center;
  text-shadow: 2px 8px 6px var(--shadow-watch-a),
    0px -5px 35px var(--shadow-watch-b);
  user-select: none;
  transition: all 0.3s ease;
}
#clock .clock__time {
  display: flex;
  align-items: baseline;
}
#clock .clock__time .time__text {
  font-size: 90px;
}
#clock .clock__time .time__mid {
  font-size: 20px;
}
#clock .clock__date {
  font-size: 24px;
}
</style>
