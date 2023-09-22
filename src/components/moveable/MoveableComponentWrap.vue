<!-- 最外层div的style会被用来存放v-bind的css变量，不能再进行:style绑定操作 -->
<!-- 第二层div用来统一控制画布模式下的cursor样式 -->
<script setup lang="ts">
import { DRAG_TRIGGER_DISTANCE } from '@/logic/const'
import { moveState, isDragMode } from '@/logic/moveable'
import { getStyleConst, localConfig } from '@/logic/store'

const props = defineProps({
  dragStyle: {
    type: String,
    required: true,
  },
  componentName: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:dragStyle'])

const moveableWrapStyle = computed(() => (isDragMode.value ? 'cursor: move !important;' : ''))

const state = reactive({
  targetContainerEle: null as null | Element,
  startState: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
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

const getPercentageInWidth = (currWidth: number) => +((currWidth / window.innerWidth) * 100).toFixed(3)

const getPercentageInHeight = (currHeight: number) => +((currHeight / window.innerHeight) * 100).toFixed(3)

/**
 * @param e
 * @param resite 是否重置位置（以光标位置为组件的中心）
 */
const startDrag = async (e: MouseEvent, resite = false) => {
  await nextTick() // 确保可以获取到 targetContainerEle
  if (!state.targetContainerEle) {
    return
  }
  const { top, left, width, height } = state.targetContainerEle.getBoundingClientRect()
  state.startState = {
    top,
    left,
    width,
    height,
    clientX: e.clientX,
    clientY: e.clientY,
  }
  if (resite) {
    // 默认光标位置为component的中心
    const offsetTop = e.clientY - height / 2
    const offsetLeft = e.clientX - width / 2
    localConfig[props.componentName as Components].layout.xOffsetValue = getPercentageInWidth(offsetLeft)
    localConfig[props.componentName as Components].layout.yOffsetValue = getPercentageInHeight(offsetTop)
    state.startState.top = offsetTop
    state.startState.left = offsetLeft
  }
  moveState.isComponentDraging = true
}

const stopDrag = () => {
  moveState.isComponentDraging = false
  moveState.isXAxisCenterVisible = false
  moveState.isYAxisCenterVisible = false
  moveState.isTopBoundVisible = false
  moveState.isBottomBoundVisible = false
  moveState.isLeftBoundVisible = false
  moveState.isRightBoundVisible = false
  if (offsetData.xOffsetKey.length !== 0) {
    localConfig[props.componentName as Components].layout.xOffsetKey = offsetData.xOffsetKey
  }
  if (offsetData.xOffsetValue !== -1) {
    localConfig[props.componentName as Components].layout.xOffsetValue = offsetData.xOffsetValue
  }
  if (offsetData.xTranslateValue !== -1) {
    localConfig[props.componentName as Components].layout.xTranslateValue = offsetData.xTranslateValue
  }
  if (offsetData.yOffsetKey.length !== 0) {
    localConfig[props.componentName as Components].layout.yOffsetKey = offsetData.yOffsetKey
  }
  if (offsetData.yOffsetValue !== -1) {
    localConfig[props.componentName as Components].layout.yOffsetValue = offsetData.yOffsetValue
  }
  if (offsetData.yTranslateValue !== -1) {
    localConfig[props.componentName as Components].layout.yTranslateValue = offsetData.yTranslateValue
  }
  // 重置dragStyle，避免覆盖组件containerStyle属性（:style="dragStyle || containerStyle"），导致导入设置文件不会刷新布局
  emit('update:dragStyle', '')
}

const onDragging = (e: MouseEvent) => {
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
  const targetCenterX = offsetData.xOffsetValue + state.startState.width / 2
  const targetCenterY = offsetData.yOffsetValue + state.startState.height / 2

  if (offsetData.xOffsetValue <= xCenterLine) {
    offsetData.xOffsetKey = 'left'
    offsetData.xOffsetValue = getPercentageInWidth(offsetData.xOffsetValue)
  } else {
    offsetData.xOffsetKey = 'right'
    offsetData.xOffsetValue = getPercentageInWidth(innerWidth - state.startState.width - offsetData.xOffsetValue)
  }
  if (offsetData.yOffsetValue <= yCenterLine) {
    offsetData.yOffsetKey = 'top'
    offsetData.yOffsetValue = getPercentageInHeight(offsetData.yOffsetValue)
  } else {
    offsetData.yOffsetKey = 'bottom'
    offsetData.yOffsetValue = getPercentageInHeight(innerHeight - state.startState.height - offsetData.yOffsetValue)
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
      moveState.isLeftBoundVisible = true
    } else {
      moveState.isRightBoundVisible = true
    }
  } else {
    moveState.isLeftBoundVisible = false
    moveState.isRightBoundVisible = false
  }
  if (offsetData.yOffsetValue < 0) {
    offsetData.yOffsetValue = 0
    if (offsetData.yOffsetKey === 'top') {
      moveState.isTopBoundVisible = true
    } else {
      moveState.isBottomBoundVisible = true
    }
  } else {
    moveState.isTopBoundVisible = false
    moveState.isBottomBoundVisible = false
  }

  const style = `${offsetData.xOffsetKey}:${offsetData.xOffsetValue}vw; ${offsetData.yOffsetKey}:${offsetData.yOffsetValue}vh; transform:translate(${offsetData.xTranslateValue}%, ${offsetData.yTranslateValue}%)`
  emit('update:dragStyle', style)
}

const initComponentMouseTask = () => {
  moveState.MouseDownTaskMap.set(props.componentName, startDrag)
  moveState.MouseMoveTaskMap.set(props.componentName, onDragging)
  moveState.MouseUpTaskMap.set(props.componentName, stopDrag)
}

onMounted(() => {
  initComponentMouseTask()
})

const isCurrentActive = computed(() => props.componentName === moveState.currDragTarget.name)

const modifyMoveableWrapClass = async (isAdd: boolean, ...classList: string[]) => {
  await nextTick()
  state.targetContainerEle = document.querySelector(`.${props.componentName}__container`)
  if (!state.targetContainerEle) {
    return
  }
  const targetClassList = state.targetContainerEle.classList
  if (targetClassList === undefined) {
    return
  }
  if (isAdd) {
    targetClassList.add(...classList)
  } else {
    targetClassList.remove(...classList)
  }
}

// 开启/关闭DragMode时，为所有组件添加或移除对应样式
watch(isDragMode, (value) => {
  if (value) {
    modifyMoveableWrapClass(true, 'element-auxiliary-line', 'element-bg-hover')
  } else {
    modifyMoveableWrapClass(false, 'element-auxiliary-line', 'element-bg-hover', 'element-active', 'element-delete')
  }
})

// 拖拽/放下任意组件时，移除/添加所有组件的hover样式
watch(
  () => moveState.isComponentDraging,
  (value) => {
    modifyMoveableWrapClass(!value, 'element-bg-hover')
  },
)

// 画布模式下，启用当前组件时添加active样式
watch(
  () => localConfig[props.componentName].enabled,
  (value) => {
    if (!isDragMode.value) {
      return
    }
    if (value) {
      modifyMoveableWrapClass(true, 'element-auxiliary-line', 'element-bg-hover', 'element-active')
    }
  },
)

// 选中当前组件时添加active样式
watch(isCurrentActive, (value) => {
  modifyMoveableWrapClass(value, 'element-active')
})

// 为当前组件添加delete样式
watch(
  () => moveState.isDeleteHover,
  (value) => {
    if (isCurrentActive.value) {
      modifyMoveableWrapClass(value, 'element-delete')
    }
  },
)

const auxiliaryLineElement = getStyleConst('auxiliaryLineElement')
const bgMoveableComponentMain = getStyleConst('bgMoveableComponentMain')
const bgMoveableComponentActive = getStyleConst('bgMoveableComponentActive')
const moveableToolDeleteBtnColor = getStyleConst('moveableToolDeleteBtnColor')
</script>

<template>
  <div>
    <div
      :style="moveableWrapStyle"
      class="moveable__wrap"
    >
      <slot />
    </div>
  </div>
</template>

<style>
.element-auxiliary-line {
  outline: 2px dashed v-bind(auxiliaryLineElement) !important;
}

.element-bg-hover:hover {
  background-color: v-bind(bgMoveableComponentMain) !important;
}

.element-active {
  background-color: v-bind(bgMoveableComponentActive) !important;
}

.element-delete {
  background-color: v-bind(moveableToolDeleteBtnColor) !important;
}
</style>
