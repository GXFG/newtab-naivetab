<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig } from '@/logic/config/state'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import { useDebounceFn } from '@vueuse/core'
import { WIDGET_CODE } from './config'

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customUnitMargin = getStyleField(
  WIDGET_CODE,
  'unit.fontSize',
  'vmin',
  0.2,
)
const customUnitFontSize = getStyleField(WIDGET_CODE, 'unit.fontSize', 'vmin')
const customDigitTextWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customDigitDivideWidth = getStyleField(WIDGET_CODE, 'width', 'vmin', 0.5)

const cdStyle = computed(() => ({
  '--nt-cd-font-family': customFontFamily.value,
  '--nt-cd-font-color': customFontColor.value,
  '--nt-cd-font-size': customFontSize.value,
  '--nt-cd-shadow-color': customShadowColor.value,
  '--nt-cd-unit-margin': customUnitMargin.value,
  '--nt-cd-unit-font-size': customUnitFontSize.value,
  '--nt-cd-digit-text-width': customDigitTextWidth.value,
  '--nt-cd-digit-divide-width': customDigitDivideWidth.value,
}))

const isRender = getIsWidgetRender(WIDGET_CODE)

const state = reactive({
  time: '',
  unit: '',
  colonVisible: true,
})

// 只在时间格式真正变化时才更新状态，避免不必要的重新渲染
const updateTime = () => {
  const now = dayjs()
  const newTime = now.format(localConfig.clockDigital.format)
  const newUnit = now.format('a')

  if (state.time !== newTime) {
    state.time = newTime
  }
  if (state.unit !== newUnit) {
    state.unit = newUnit
  }
  // 每秒切换冒号可见性，与系统时钟同步
  state.colonVisible = !state.colonVisible
}

const debouncedUpdateTime = useDebounceFn(updateTime, 50)

// 监听组件是否渲染
watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(WIDGET_CODE)
      return
    }
    // 初始化时立即更新一次
    updateTime()
    // 添加定时任务，使用防抖函数
    addTimerTask(WIDGET_CODE, debouncedUpdateTime)
  },
  { immediate: true },
)
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="clockDigital__container"
      :style="cdStyle"
      :class="{
        'clockDigital__container--shadow':
          localConfig.clockDigital.isShadowEnabled,
      }"
    >
      <div class="clock__time">
        <p class="time__text">
          <template
            v-for="(item, index) in state.time.split('')"
            :key="index"
          >
            <span
              v-if="Number.isNaN(+item)"
              class="text__divide"
              :class="{
                'text__divide--dim':
                  localConfig.clockDigital.colonBlinkEnabled &&
                  !state.colonVisible,
              }"
              >{{ item }}</span
            >
            <span
              v-else
              class="text__digit"
              >{{ item }}</span
            >
          </template>
        </p>
        <span
          v-if="localConfig.clockDigital.unitEnabled"
          class="time__unit"
          >{{ state.unit }}</span
        >
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#clockDigital {
  user-select: none;

  .clockDigital__container {
    z-index: 10;
    position: absolute;
    text-align: center;
    font-family: var(--nt-cd-font-family);
    color: var(--nt-cd-font-color);

    .clock__time {
      display: flex;
      justify-content: center;
      align-items: baseline;

      .time__text {
        font-size: var(--nt-cd-font-size);
        letter-spacing: 0.01em;

        .text__digit {
          display: inline-block;
          width: var(--nt-cd-digit-text-width);
          text-align: center;
        }
        .text__divide {
          display: inline-block;
          width: var(--nt-cd-digit-divide-width);
          text-align: center;
          opacity: 1;
          transition: opacity 0.15s ease;

          &.text__divide--dim {
            opacity: 0.15;
          }
        }
      }

      .time__unit {
        margin-left: var(--nt-cd-unit-margin);
        font-size: var(--nt-cd-unit-font-size);
        opacity: 0.7;
        letter-spacing: 0.05em;
      }
    }
  }

  /* 多层文字阴影：近距硬影 + 中距扩散 + 远距光晕 */
  .clockDigital__container--shadow {
    text-shadow:
      1px 2px 2px var(--nt-cd-shadow-color),
      2px 6px 10px var(--nt-cd-shadow-color),
      0 0 30px color-mix(in srgb, var(--nt-cd-shadow-color) 40%, transparent);
  }
}
</style>
