<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig } from '@/logic/config/state'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import { currDayjsLang } from '@/logic/store/theme'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customLetterSpacing = getStyleField(WIDGET_CODE, 'letterSpacing', 'vmin')

const dateStyle = computed(() => ({
  '--nt-d-font-family': customFontFamily.value,
  '--nt-d-font-color': customFontColor.value,
  '--nt-d-font-size': customFontSize.value,
  '--nt-d-shadow-color': customShadowColor.value,
  '--nt-d-letter-spacing': customLetterSpacing.value,
}))

const isRender = getIsWidgetRender(WIDGET_CODE)

const state = reactive({
  date: '',
})

const updateDate = () => {
  state.date = dayjs()
    .locale(currDayjsLang.value)
    .format(localConfig.date.format)
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
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="date__container"
      :style="dateStyle"
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
  user-select: none;

  .date__container {
    z-index: 10;
    position: absolute;
    font-family: var(--nt-d-font-family);
    color: var(--nt-d-font-color);

    .date__text {
      font-size: var(--nt-d-font-size);
      letter-spacing: var(--nt-d-letter-spacing);
      white-space: nowrap;
      word-spacing: 0.15em;
    }
  }

  /* 多层文字阴影：近距硬影 + 中距扩散 + 远距光晕 */
  .date__container--shadow {
    text-shadow:
      1px 2px 2px var(--nt-d-shadow-color),
      2px 6px 10px var(--nt-d-shadow-color),
      0 0 24px color-mix(in srgb, var(--nt-d-shadow-color) 35%, transparent);
  }
}
</style>
