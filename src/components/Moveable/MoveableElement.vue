<template>
  <!-- 最外层div的style会被用来存放v-bind的变量，不能再进行:style操作 -->
  <div>
    <div ref="moveableWrapEl" :style="moveableWrapStyle" class="moveable-wrap">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DRAG_TRIGGER_DISTANCE, getStyleConst, globalState, moveState, isDragMode, currDragComponentName } from '@/logic'

const props = defineProps({
  componentName: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['onDrag'])

const moveableWrapStyle = computed(() => (isDragMode.value ? 'cursor: move !important;' : ''))

const moveableWrapEl = ref()
const targetEl = ref()

const state = reactive({
  isDraging: false,
  startState: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    clientX: 0,
    clientY: 0,
  },
})

const offsetData = reactive({
  xOffsetKey: '',
  xOffsetValue: -1,
  xTranslateValue: -1,
  yOffsetKey: '',
  yOffsetValue: -1,
  yTranslateValue: -1,
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
  moveState.isTopVisible = false
  moveState.isBottomVisible = false
  moveState.isLeftVisible = false
  moveState.isRightVisible = false
  if (offsetData.xOffsetKey.length !== 0) globalState.style[props.componentName as TComponents].layout.xOffsetKey = offsetData.xOffsetKey
  if (offsetData.xOffsetValue !== -1) globalState.style[props.componentName as TComponents].layout.xOffsetValue = offsetData.xOffsetValue
  if (offsetData.xTranslateValue !== -1) globalState.style[props.componentName as TComponents].layout.xTranslateValue = offsetData.xTranslateValue
  if (offsetData.yOffsetKey.length !== 0) globalState.style[props.componentName as TComponents].layout.yOffsetKey = offsetData.yOffsetKey
  if (offsetData.yOffsetValue !== -1) globalState.style[props.componentName as TComponents].layout.yOffsetValue = offsetData.yOffsetValue
  if (offsetData.yTranslateValue !== -1) globalState.style[props.componentName as TComponents].layout.yTranslateValue = offsetData.yTranslateValue
}

const getPercentageInWidth = (currWidth: number) => +((currWidth / window.innerWidth) * 100).toFixed(3)
const getPercentageInHeight = (currHeight: number) => +((currHeight / window.innerHeight) * 100).toFixed(3)

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
  offsetData.xTranslateValue = 0
  offsetData.yTranslateValue = 0

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

  // 水平/垂直居中 & 对应辅助线
  if (Math.abs(targetCenterX - xCenterLine) <= DRAG_TRIGGER_DISTANCE) {
    moveState.isXAxisCenterVisible = true
    offsetData.xOffsetKey = 'left'
    offsetData.xOffsetValue = 50
    offsetData.xTranslateValue = -50
  } else {
    moveState.isXAxisCenterVisible = false
    offsetData.xTranslateValue = 0
  }
  if (Math.abs(targetCenterY - yCenterLine) <= DRAG_TRIGGER_DISTANCE) {
    moveState.isYAxisCenterVisible = true
    offsetData.yOffsetKey = 'top'
    offsetData.yOffsetValue = 50
    offsetData.yTranslateValue = -50
  } else {
    moveState.isYAxisCenterVisible = false
    offsetData.yTranslateValue = 0
  }

  // 画布边界限制 & 对应辅助线
  if (offsetData.xOffsetValue < 0) {
    offsetData.xOffsetValue = 0
    if (offsetData.xOffsetKey === 'left') {
      moveState.isLeftVisible = true
    } else {
      moveState.isRightVisible = true
    }
  } else {
    moveState.isLeftVisible = false
    moveState.isRightVisible = false
  }
  if (offsetData.yOffsetValue < 0) {
    offsetData.yOffsetValue = 0
    if (offsetData.yOffsetKey === 'top') {
      moveState.isTopVisible = true
    } else {
      moveState.isBottomVisible = true
    }
  } else {
    moveState.isTopVisible = false
    moveState.isBottomVisible = false
  }

  const style = `${offsetData.xOffsetKey}:${offsetData.xOffsetValue}vw; ${offsetData.yOffsetKey}:${offsetData.yOffsetValue}vh; transform:translate(${offsetData.xTranslateValue}%, ${offsetData.yTranslateValue}%)`
  emit('onDrag', style)
}

const isEnabled = computed(() => globalState.setting[props.componentName].enabled)
const isCurrent = computed(() => currDragComponentName.value === props.componentName)

const initDrag = async() => {
  await nextTick()
  targetEl.value = document.querySelector(`.${props.componentName}__container`)
  moveState.MouseDownTaskMap.set(props.componentName, startDrag)
  moveState.MouseMoveTaskMap.set(props.componentName, onDrag)
  moveState.MouseUpTaskMap.set(props.componentName, stopDrag)
}

const getMoveableWrapEl = () => moveableWrapEl.value.children[0].children[0].classList

const modifyMoveableWrapClass = async(isAdd: boolean) => {
  await nextTick()
  const targetClassList = getMoveableWrapEl()
  if (isAdd) {
    targetClassList.add('element-auxiliary-line', 'element-bg-hover')
  } else {
    targetClassList.remove('element-auxiliary-line', 'element-bg-hover', 'element-active')
  }
}

watch(isCurrent, (value) => {
  if (!isEnabled.value) {
    return
  }
  const targetClassList = getMoveableWrapEl()
  if (value) {
    targetClassList.add('element-active')
  } else {
    targetClassList.remove('element-active')
  }
})

watch(isDragMode, (value) => {
  if (!isEnabled.value) {
    return
  }
  initDrag()
  modifyMoveableWrapClass(value)
})

watch(() => globalState.setting[props.componentName].enabled, (value: boolean) => {
  if (!value) {
    return
  }
  initDrag()
  modifyMoveableWrapClass(true)
})

const auxiliaryLineElement = getStyleConst('auxiliaryLineElement')
const bgMoveableElementMain = getStyleConst('bgMoveableElementMain')
const bgMoveableElementActive = getStyleConst('bgMoveableElementActive')

</script>

<style>
.element-auxiliary-line {
  outline: 1px dashed v-bind(auxiliaryLineElement);
}

.element-bg-hover:hover {
  background-color: v-bind(bgMoveableElementMain) !important;
}

.element-active {
  background-color: v-bind(bgMoveableElementActive) !important;
}
</style>
