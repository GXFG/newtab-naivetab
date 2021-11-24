<template>
  <div v-if="globalState.setting.clock.enabled" id="date" :style="positionStyle">
    <p class="date__text">
      {{ state.date }}
    </p>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { globalState, getLayoutStyle } from '@/logic'

const positionStyle = computed(() => getLayoutStyle('date'))

const state = reactive({
  date: '',
})

const updateDate = () => {
  state.date = dayjs().format('YYYY-MM-DD dddd')
}

updateDate()

</script>

<style scoped>
#date {
  position: fixed;
  font-family: "Arial Rounded MT Bold", "Rockwell", "Andale Mono", monospace;
  color: var(--text-color-watch);
  text-align: center;
  text-shadow: 2px 8px 6px var(--shadow-watch-a),
    0px -5px 35px var(--shadow-watch-b);
  user-select: none;
  transition: all 0.3s ease;
  .date__text {
    font-size: 24px;
  }
}
</style>
