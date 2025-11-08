<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig, getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic/store'
import MoveableComponentWrap from '@/newtab/components/moveable/MoveableComponentWrap.vue'
import { useDebounceFn } from '@vueuse/core'

const CNAME = 'clockDigital'
const isRender = getIsComponentRender(CNAME)

const state = reactive({
  time: '',
  unit: '',
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
}

const debouncedUpdateTime = useDebounceFn(updateTime, 50)

// 监听组件是否渲染
watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(CNAME)
      return
    }
    // 初始化时立即更新一次
    updateTime()
    // 添加定时任务，使用防抖函数
    addTimerTask(CNAME, debouncedUpdateTime)
  },
  { immediate: true },
)

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'vmin')
const customShadowColor = getStyleField(CNAME, 'shadowColor')

const customUnitMargin = getStyleField(CNAME, 'unit.fontSize', 'vmin', 0.2)
const customUnitFontSize = getStyleField(CNAME, 'unit.fontSize', 'vmin')

const customDigitTextWidth = getStyleField(CNAME, 'width', 'vmin')
const customDigitDivideWidth = getStyleField(CNAME, 'width', 'vmin', 0.5)
</script>

<template>
  <MoveableComponentWrap
    v-model:dragStyle="dragStyle"
    component-name="clockDigital"
  >
    <div
      v-if="isRender"
      id="digital-clock"
      data-target-type="component"
      data-target-name="clockDigital"
    >
      <div
        class="clockDigital__container"
        :style="dragStyle || containerStyle"
        :class="{ 'clockDigital__container--shadow': localConfig.clockDigital.isShadowEnabled }"
      >
        <div class="clock__time">
          <p class="time__text">
            <template
              v-for="(item, index) in state.time.split('')"
              :key="index"
            >
              <span :class="Number.isNaN(+item) ? 'text__divide' : 'text__digit'">{{ item }}</span>
            </template>
          </p>
          <span
            v-if="localConfig.clockDigital.unitEnabled"
            class="time__unit"
          >{{ state.unit }}</span>
        </div>
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<style scoped>
#digital-clock {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  user-select: none;
  .clockDigital__container {
    z-index: 10;
    position: absolute;
    text-align: center;
    .clock__time {
      display: flex;
      justify-content: center;
      align-items: baseline;
      .time__text {
        font-size: v-bind(customFontSize);
        .text__digit {
          display: inline-block;
          width: v-bind(customDigitTextWidth);
          text-align: center;
        }
        .text__divide {
          display: inline-block;
          width: v-bind(customDigitDivideWidth);
          text-align: center;
        }
      }
      .time__unit {
        margin-left: v-bind(customUnitMargin);
        font-size: v-bind(customUnitFontSize);
      }
    }
  }
  .clockDigital__container--shadow {
    text-shadow: 2px 8px 6px v-bind(customShadowColor);
  }
}
</style>
