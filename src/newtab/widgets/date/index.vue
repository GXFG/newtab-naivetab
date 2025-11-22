<script setup lang="ts">
import { measureMountedPerf } from '@/logic/util'
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { currDayjsLang, localConfig, getIsWidgetRender, getLayoutStyle, getStyleField } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

const state = reactive({
  date: '',
})

const updateDate = () => {
  state.date = dayjs().locale(currDayjsLang.value).format(localConfig.date.format)
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(WIDGET_CODE)
      return
    }
    addTimerTask(WIDGET_CODE, updateDate)
  },
  { immediate: true },
)

onMounted(() => {
  measureMountedPerf(WIDGET_CODE)
})

const dragStyle = ref('')
const containerStyle = getLayoutStyle(WIDGET_CODE)
const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customLetterSpacing = getStyleField(WIDGET_CODE, 'letterSpacing', 'vmin')
</script>

<template>
  <WidgetWrap
    v-model:dragStyle="dragStyle"
    widget-code="date"
  >
    <div
      v-if="isRender"
      id="date"
      data-target-type="widget"
      data-target-code="date"
    >
      <div
        class="date__container"
        :style="dragStyle || containerStyle"
        :class="{ 'date__container--shadow': localConfig.date.isShadowEnabled }"
      >
        <p class="date__text">
          {{ state.date }}
        </p>
      </div>
    </div>
  </WidgetWrap>
</template>

<style scoped>
#date {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  user-select: none;
  .date__container {
    z-index: 10;
    position: absolute;
    .date__text {
      font-size: v-bind(customFontSize);
      letter-spacing: v-bind(customLetterSpacing);
      white-space: nowrap;
    }
  }
  .date__container--shadow {
    text-shadow: 2px 8px 6px v-bind(customShadowColor);
  }
}
</style>
