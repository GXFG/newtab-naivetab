<template>
  <div :style="targetStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { DRAG_TRIGGER_DISTANCE, globalState, moveState, isDragMode } from '@/logic'

const props = defineProps({
  componentName: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['onDrag'])

const targetStyle = computed(() => isDragMode ? 'cursor: move;' : '')

const targetEl = ref()

const state = reactive({
  isDraging: false,
  startState: {} as any,
})

const offsetData = reactive({
  xOffsetKey: '',
  yOffsetKey: '',
  xOffsetValue: 0,
  yOffsetValue: 0,
})

const startDrag = (e: MouseEvent) => {
  const { top, right, bottom, left } = targetEl.value.getBoundingClientRect()
  state.startState = {
    top,
    right,
    bottom,
    left,
    clientX: e.clientX,
    clientY: e.clientY,
  }
  state.isDraging = true
}

const stopDrag = () => {
  state.isDraging = false
  moveState.isXAxisCenterVisible = false
  moveState.isYAxisCenterVisible = false
  globalState.setting[props.componentName as any].layout.xOffsetKey = offsetData.xOffsetKey
  globalState.setting[props.componentName as any].layout.xOffsetValue = offsetData.xOffsetValue
  globalState.setting[props.componentName as any].layout.yOffsetKey = offsetData.yOffsetKey
  globalState.setting[props.componentName as any].layout.yOffsetValue = offsetData.yOffsetValue
}

const getPercentageInWidth = (currWidth: number) => currWidth / window.innerWidth * 100
const getPercentageInHeight = (currHeight: number) => currHeight / window.innerHeight * 100

const onDrag = (e: MouseEvent) => {
  if (!state.isDraging) {
    return
  }
  const mouseDiffX = e.clientX - state.startState.clientX
  const mouseDiffY = e.clientY - state.startState.clientY
  offsetData.xOffsetKey = ''
  offsetData.yOffsetKey = ''
  offsetData.xOffsetValue = state.startState.left + mouseDiffX
  offsetData.yOffsetValue = state.startState.top + mouseDiffY

  const { innerWidth, innerHeight } = window
  const xCenterLine = innerWidth / 2
  const yCenterLine = innerHeight / 2
  const { width, height } = targetEl.value.getBoundingClientRect()
  const targetCenterX = offsetData.xOffsetValue + width / 2
  const targetCenterY = offsetData.yOffsetValue + height / 2

  if (offsetData.xOffsetValue <= xCenterLine) {
    offsetData.xOffsetKey = 'left'
    offsetData.xOffsetValue = getPercentageInWidth(offsetData.xOffsetValue)
  } else {
    offsetData.xOffsetKey = 'right'
    offsetData.xOffsetValue = getPercentageInWidth(innerWidth - width - offsetData.xOffsetValue)
  }
  if (offsetData.yOffsetValue <= yCenterLine) {
    offsetData.yOffsetKey = 'top'
    offsetData.yOffsetValue = getPercentageInHeight(offsetData.yOffsetValue)
  } else {
    offsetData.yOffsetKey = 'bottom'
    offsetData.yOffsetValue = getPercentageInHeight(innerHeight - height - offsetData.yOffsetValue)
  }
  // 辅助线
  if (Math.abs(targetCenterX - xCenterLine) <= DRAG_TRIGGER_DISTANCE) {
    moveState.isXAxisCenterVisible = true
    // 水平居中
    offsetData.xOffsetKey = 'left'
    offsetData.xOffsetValue = getPercentageInWidth(innerWidth / 2 - width / 2)
  } else {
    moveState.isXAxisCenterVisible = false
  }
  if (Math.abs(targetCenterY - yCenterLine) <= DRAG_TRIGGER_DISTANCE) {
    moveState.isYAxisCenterVisible = true
    // 垂直居中
    offsetData.yOffsetKey = 'top'
    offsetData.yOffsetValue = getPercentageInHeight(innerHeight / 2 - height / 2)
  } else {
    moveState.isYAxisCenterVisible = false
  }
  // 边界
  if (offsetData.xOffsetValue < 0) {
    offsetData.xOffsetValue = 0
  }
  if (offsetData.yOffsetValue < 0) {
    offsetData.yOffsetValue = 0
  }

  emit('onDrag', `${offsetData.xOffsetKey}:${offsetData.xOffsetValue}vw; ${offsetData.yOffsetKey}:${offsetData.yOffsetValue}vh`)
}

const initDrag = () => {
  targetEl.value = document.querySelector(`.${props.componentName}__container`)
  moveState.MouseDownTaskList[props.componentName as any] = startDrag
  moveState.MouseMoveTaskList.push(onDrag)
  moveState.MouseUpTaskList[props.componentName as any] = stopDrag
}

onMounted(() => {
  initDrag()
})
</script>

<style scoped>
</style>
