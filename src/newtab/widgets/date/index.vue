<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { currDayjsLang, localConfig, getIsWidgetRender, getStyleField } from '@/logic/store'
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

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customLetterSpacing = getStyleField(WIDGET_CODE, 'letterSpacing', 'vmin')
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="date__container"
      :class="{ 'date__container--shadow': localConfig.date.isShadowEnabled }"
    >
      <p class="date__text">
        {{ state.date }}
      </p>
    </div>
  </WidgetWrap>
</template>

<style>
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
