<template>
  <!-- 最外层div的style会被用来存放v-bind的变量，不能再进行:style操作 -->
  <div>
    <div ref="moveableWrapEl" :style="moveableWrapStyle" class="moveable-wrap">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DRAG_TRIGGER_DISTANCE, getStyleConst, globalState, moveState, isDragMode } from '@/logic'

const props = defineProps({
  componentName: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['drag'])

const moveableWrapStyle = computed(() => (isDragMode.value ? 'cursor: move !important;' : ''))

const moveableWrapEl = ref()
const targetEle = ref()

const state = reactive({
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
const startDrag = async(e: MouseEvent, resite = false) => {
  await nextTick() // 确保可以获取到targetEle
  const { top, left, width, height } = targetEle.value.getBoundingClientRect()
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
    const _top = e.clientY - height / 2
    const _left = e.clientX - width / 2
    globalState.style[props.componentName as TComponents].layout.xOffsetValue = getPercentageInWidth(_left)
    globalState.style[props.componentName as TComponents].layout.yOffsetValue = getPercentageInHeight(_top)
    state.startState.top = _top
    state.startState.left = _left
  }
  moveState.isDragingMap[props.componentName] = true
  moveState.isComponentDraging = true
}

const stopDrag = () => {
  moveState.isDragingMap[props.componentName] = false
  moveState.isComponentDraging = false
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

const onDrag = (e: MouseEvent) => {
  if (!moveState.isDragingMap[props.componentName]) {
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
  emit('drag', style)
}

const initMouseTask = () => {
  moveState.MouseDownTaskMap.set(props.componentName, startDrag)
  moveState.MouseMoveTaskMap.set(props.componentName, onDrag)
  moveState.MouseUpTaskMap.set(props.componentName, stopDrag)
}

onMounted(() => {
  initMouseTask()
})

const isEnabled = computed(() => globalState.setting[props.componentName].enabled || moveState.dragTempEnabledMap[props.componentName])
const isCurrent = computed(() => props.componentName === moveState.currDragTarget.name)

const initTargetEle = async() => {
  await nextTick()
  targetEle.value = document.querySelector(`.${props.componentName}__container`)
}

const modifyMoveableWrapClass = async(isAdd: boolean, ...classList: string[]) => {
  await nextTick()
  const targetClassList = moveableWrapEl.value?.children[0]?.children[0]?.classList
  if (targetClassList === undefined) {
    return
  }
  if (isAdd) {
    targetClassList.add(...classList)
  } else {
    targetClassList.remove(...classList)
  }
}

const modifyMoveableWrapBorder = async(isAdd: boolean) => {
  if (isAdd) {
    modifyMoveableWrapClass(true, 'element-auxiliary-line', 'element-bg-hover')
  } else {
    modifyMoveableWrapClass(false, 'element-auxiliary-line', 'element-bg-hover', 'element-active', 'element-delete')
  }
}

watch(isDragMode, (value) => {
  if (!isEnabled.value) {
    return
  }
  initTargetEle()
  modifyMoveableWrapBorder(value)
}, { immediate: true })

watch(isEnabled, (value: boolean) => {
  if (!isDragMode.value || !value) {
    return
  }
  initTargetEle()
  modifyMoveableWrapBorder(true)
})

watch(isCurrent, async(value) => {
  if (!isEnabled.value) {
    return
  }
  modifyMoveableWrapClass(value, 'element-active')
  modifyMoveableWrapClass(!value, 'element-bg-hover') // 当前选中的Component无hover样式
})

watch(() => moveState.isDeleteHover, async(value) => {
  if (!isCurrent.value) {
    return
  }
  modifyMoveableWrapClass(value, 'element-delete')
})

const auxiliaryLineElement = getStyleConst('auxiliaryLineElement')
const bgMoveableComponentMain = getStyleConst('bgMoveableComponentMain')
const bgMoveableComponentActive = getStyleConst('bgMoveableComponentActive')
const moveableToolDeleteBtnColor = getStyleConst('moveableToolDeleteBtnColor')

</script>

<style>
.element-auxiliary-line {
  outline: 1px dashed v-bind(auxiliaryLineElement) !important;
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
