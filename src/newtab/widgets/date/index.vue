<script setup lang="ts">
import { addDailyTask, removeDailyTask } from '@/logic/task'
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

/**
 * 显示的是日期（默认格式 `YYYY-MM-DD dddd`，不含时间），只需要按天刷新，
 * 因此用 addDailyTask 而不是每秒跑一次：后者会对同一个结果重复格式化 86400 次。
 */
const updateDate = (now: Date = new Date()) => {
  state.date = dayjs(now)
    .locale(currDayjsLang.value)
    .format(localConfig.date.format)
}

/**
 * 禁用只销毁 WidgetWrap 内部的 slot DOM（组件不卸载），所以清理必须挂 `isRender`；
 * `onUnmounted` 只兜「组件真被销毁」那一种（错误边界）。
 * 首次渲染由 addDailyTask 的「注册即执行」负责，不必再单独调 updateDate。
 */
watch(
  isRender,
  (value) => {
    if (!value) {
      removeDailyTask(WIDGET_CODE)
      return
    }
    addDailyTask(WIDGET_CODE, updateDate)
  },
  { immediate: true },
)

onUnmounted(() => removeDailyTask(WIDGET_CODE))

/**
 * 语言或格式变化不会跨天，但文案要立刻跟上。
 * 以前靠「每秒重算」顺带覆盖，改成日切后必须显式监听，否则切语言要等到第二天。
 */
watch([currDayjsLang, () => localConfig.date.format], () => updateDate())
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
    z-index: var(--nt-z-index);
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
