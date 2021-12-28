<template>
  <Moveable componentName="date" @onDrag="(style) => (containerStyle = style)">
    <div v-if="globalState.setting.date.enabled" id="date" cname="date">
      <div class="date__container" :style="containerStyle" :class="{ 'date__container--shadow': globalState.style.date.isShadowEnabled }">
        <p class="date__text">
          {{ state.date }}
        </p>
      </div>
    </div>
  </Moveable>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { currDayjsLang, globalState, addTimerTask, removeTimerTask, getLayoutStyle, formatNumWithPixl } from '@/logic'

const CNAME = 'date'

const state = reactive({
  date: '',
})

const updateDate = () => {
  state.date = dayjs().locale(currDayjsLang.value).format(globalState.setting.date.format)
}

watch(
  () => globalState.setting.date.enabled,
  (value) => {
    if (value) {
      updateDate()
      addTimerTask(CNAME, updateDate)
    } else {
      removeTimerTask(CNAME)
    }
  },
  { immediate: true },
)

const containerStyle = ref(getLayoutStyle(CNAME))
const customFontSize = computed(() => formatNumWithPixl(CNAME, 'fontSize'))
</script>

<style scoped>
#date {
  font-family: v-bind(globalState.style.date.fontFamily);
  color: v-bind(globalState.style.date.fontColor[globalState.localState.currThemeCode]);
  user-select: none;
  .date__container {
    position: absolute;
    .date__text {
      font-size: v-bind(customFontSize);
    }
  }
  .date__container--shadow {
    text-shadow: 2px 8px 6px v-bind(globalState.style.date.shadowColor[globalState.localState.currThemeCode]);
  }
}
</style>
