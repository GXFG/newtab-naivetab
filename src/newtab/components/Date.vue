<template>
  <div v-if="globalState.setting.date.enabled" id="date" :style="positionStyle">
    <p class="date__text">
      {{ state.date }}
    </p>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { globalState, getLayoutStyle, getCustomFontSize } from '@/logic'

const state = reactive({
  date: '',
})

const updateDate = () => {
  state.date = dayjs().format('YYYY-MM-DD dddd')
}

updateDate()

const positionStyle = computed(() => getLayoutStyle('date'))

const customFontSize = computed(() => getCustomFontSize('date'))

</script>

<style scoped>
#date {
  position: fixed;
  font-family: v-bind(globalState.setting.date.style.fontFamily);
  color: v-bind(globalState.setting.date.style.fontColor[globalState.localState.currThemeCode]);
  text-align: center;
  text-shadow: 2px 8px 6px var(--shadow-watch-a),
    0px -5px 35px var(--shadow-watch-b);
  user-select: none;
  transition: all 0.3s ease;
  .date__text {
    font-size: v-bind(customFontSize);
  }
}
</style>
