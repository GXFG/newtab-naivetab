<template>
  <div v-if="globalState.setting.date.enabled" id="date">
    <div class="date__container" :style="containerStyle">
      <p class="date__text">
        {{ state.date }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { globalState, getLayoutStyle, formatNumWithPixl } from '@/logic'

const CNAME = 'date'

const state = reactive({
  date: '',
})

const updateDate = () => {
  state.date = dayjs().format(globalState.setting.date.format)
}

updateDate()

watch(() => globalState.setting.date.format, () => {
  updateDate()
})

const positionStyle = computed(() => getLayoutStyle(CNAME))

const containerStyle = computed(() => {
  let style = ''
  if (globalState.style.date.isShadowEnabled) {
    style += `text-shadow: 2px 8px 6px ${globalState.style.date.shadowColor[globalState.localState.currThemeCode]};`
  }
  return style + positionStyle.value
})

const customFontSize = computed(() => formatNumWithPixl(CNAME, 'fontSize'))

</script>

<style scoped>
#date {
  font-family: v-bind(globalState.style.date.fontFamily);
  color: v-bind(globalState.style.date.fontColor[globalState.localState.currThemeCode]);
  user-select: none;
  .date__container {
    position: fixed;
    text-align: center;
    transition: all 0.3s ease;
    .date__text {
      font-size: v-bind(customFontSize);
    }
  }
}
</style>
