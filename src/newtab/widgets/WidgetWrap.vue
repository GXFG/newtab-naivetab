<script setup lang="ts">
import { DRAG_TRIGGER_DISTANCE } from '@/logic/constants/index'
import { moveState, isDragMode } from '@/logic/moveable'
import { localConfig, getStyleConst } from '@/logic/store'

const props = defineProps({
  widgetCode: {
    type: String as PropType<WidgetCodes>,
    required: true,
  },
})

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
  // 使用CSS变量存储drag时的位置信息，减少样式计算和DOM操作
  cssVars: {
    xOffset: '0',
    yOffset: '0',
    xTranslate: '0',
    yTranslate: '0',
  },
  // 缓存上一次的OffsetKey，用于优化style更新
  lastXOffsetKey: '',
  lastYOffsetKey: '',
})

const offsetData = reactive({
  xOffsetKey: '',
  xOffsetValue: -1,
  xTranslateValue: -1,
  yOffsetKey: '',
  yOffsetValue: -1,
  yTranslateValue: -1,
})

const getPercentageInWidth = (currWidth: number) => +((currWidth / moveState.width) * 100).toFixed(5)
const getPercentageInHeight = (currHeight: number) => +((currHeight / moveState.height) * 100).toFixed(5)

const ensureTargetContainer = async (): Promise<HTMLElement | null> => {
  await nextTick()
  if (!state.targetContainerEle) {
    state.targetContainerEle = document.querySelector(`.${props.widgetCode}__container`)
  }
  return state.targetContainerEle as HTMLElement | null
}

/**
 * @param e
 * @param resite 是否重置位置（以光标位置为组件的中心），DraftDrawer使用以光标位置为组件的中心开始拖拽
 */
const startDrag = async (e: MouseEvent, resite = false) => {
  const el = await ensureTargetContainer()
  if (!el) {
    return
  }
  const { top, left, width, height } = el.getBoundingClientRect()
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
    localConfig[props.widgetCode].layout.xOffsetValue = getPercentageInWidth(offsetLeft)
    localConfig[props.widgetCode].layout.yOffsetValue = getPercentageInHeight(offsetTop)
    state.startState.top = offsetTop
    state.startState.left = offsetLeft
  }
  moveState.isWidgetStartDrag = true
}

const applyContainerLayout = async () => {
  const el = await ensureTargetContainer()
  if (!el) {
    return
  }
  const layout = localConfig[props.widgetCode].layout
  if (layout.xOffsetKey === 'left') {
    el.style.right = ''
  } else {
    el.style.left = ''
  }
  el.style.setProperty(layout.xOffsetKey, `${layout.xOffsetValue}vw`)
  if (layout.yOffsetKey === 'top') {
    el.style.bottom = ''
  } else {
    el.style.top = ''
  }
  el.style.setProperty(layout.yOffsetKey, `${layout.yOffsetValue}vh`)
  el.style.setProperty('transform', `translate(${layout.xTranslateValue}%, ${layout.yTranslateValue}%)`)
}

let applyLayoutScheduled = false
/**
 * 调度applyContainerLayout函数:
 * 在同一帧内合并多次触发，避免stopDrag连续更新config引发的多次布局写入
 */
const scheduleApplyContainerLayout = () => {
  if (applyLayoutScheduled) {
    return
  }
  applyLayoutScheduled = true
  requestAnimationFrame(async () => {
    applyLayoutScheduled = false
    if (moveState.isWidgetStartDrag) {
      return
    }
    await applyContainerLayout()
  })
}

const stopDrag = () => {
  moveState.isWidgetStartDrag = false
  moveState.isXAxisCenterVisible = false
  moveState.isYAxisCenterVisible = false
  moveState.isTopBoundVisible = false
  moveState.isBottomBoundVisible = false
  moveState.isLeftBoundVisible = false
  moveState.isRightBoundVisible = false
  // stopDrag后才更新localConfig
  if (offsetData.xOffsetKey.length !== 0) {
    localConfig[props.widgetCode].layout.xOffsetKey = offsetData.xOffsetKey
  }
  if (offsetData.yOffsetKey.length !== 0) {
    localConfig[props.widgetCode].layout.yOffsetKey = offsetData.yOffsetKey
  }
  if (offsetData.xOffsetValue !== -1) {
    localConfig[props.widgetCode].layout.xOffsetValue = offsetData.xOffsetValue
  }
  if (offsetData.yOffsetValue !== -1) {
    localConfig[props.widgetCode].layout.yOffsetValue = offsetData.yOffsetValue
  }
  if (offsetData.xTranslateValue !== -1) {
    localConfig[props.widgetCode].layout.xTranslateValue = offsetData.xTranslateValue
  }
  if (offsetData.yTranslateValue !== -1) {
    localConfig[props.widgetCode].layout.yTranslateValue = offsetData.yTranslateValue
  }
  state.lastXOffsetKey = ''
  state.lastYOffsetKey = ''
  scheduleApplyContainerLayout()
}

const onDragging = async (e: MouseEvent) => {
  const el = await ensureTargetContainer()
  if (!el) {
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

  const xCenterLine = moveState.width / 2
  const yCenterLine = moveState.height / 2
  const targetCenterX = offsetData.xOffsetValue + state.startState.width / 2
  const targetCenterY = offsetData.yOffsetValue + state.startState.height / 2

  if (offsetData.xOffsetValue <= xCenterLine) {
    offsetData.xOffsetKey = 'left'
    offsetData.xOffsetValue = getPercentageInWidth(offsetData.xOffsetValue)
  } else {
    offsetData.xOffsetKey = 'right'
    offsetData.xOffsetValue = getPercentageInWidth(moveState.width - state.startState.width - offsetData.xOffsetValue)
  }
  if (offsetData.yOffsetValue <= yCenterLine) {
    offsetData.yOffsetKey = 'top'
    offsetData.yOffsetValue = getPercentageInHeight(offsetData.yOffsetValue)
  } else {
    offsetData.yOffsetKey = 'bottom'
    offsetData.yOffsetValue = getPercentageInHeight(moveState.height - state.startState.height - offsetData.yOffsetValue)
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

  // 使用CSS变量更新样式，减少DOM操作
  state.cssVars.xOffset = `${offsetData.xOffsetValue}vw`
  state.cssVars.yOffset = `${offsetData.yOffsetValue}vh`
  state.cssVars.xTranslate = `${offsetData.xTranslateValue}%`
  state.cssVars.yTranslate = `${offsetData.yTranslateValue}%`

  // 拖动组件时使用css变量，停止拖动时才触发真实config的更新
  if (!state.lastXOffsetKey || !state.lastYOffsetKey || state.lastXOffsetKey !== offsetData.xOffsetKey || state.lastYOffsetKey !== offsetData.yOffsetKey) {
    // 只在 xOffsetKey 或 yOffsetKey 值变化时才触发更新dragStyle
    if (offsetData.xOffsetKey === 'left') {
      el.style.left = 'var(--x-offset)'
      el.style.right = ''
    } else {
      el.style.right = 'var(--x-offset)'
      el.style.left = ''
    }
    if (offsetData.yOffsetKey === 'top') {
      el.style.top = 'var(--y-offset)'
      el.style.bottom = ''
    } else {
      el.style.bottom = 'var(--y-offset)'
      el.style.top = ''
    }
    el.style.transform = 'translate(var(--x-translate), var(--y-translate))'
    // 更新缓存的值
    state.lastXOffsetKey = offsetData.xOffsetKey
    state.lastYOffsetKey = offsetData.yOffsetKey
  }
}
onMounted(() => {
  applyContainerLayout()
  moveState.mouseDownTaskMap.set(props.widgetCode, startDrag)
  moveState.mouseMoveTaskMap.set(props.widgetCode, onDragging)
  moveState.mouseUpTaskMap.set(props.widgetCode, stopDrag)
})

onUnmounted(() => {
  moveState.mouseDownTaskMap.delete(props.widgetCode)
  moveState.mouseMoveTaskMap.delete(props.widgetCode)
  moveState.mouseUpTaskMap.delete(props.widgetCode)
})

const isEnabled = computed(() => localConfig[props.widgetCode].enabled)

const isCurrentActive = computed(() => props.widgetCode === moveState.currDragTarget.code)

const isFocusVisible = computed(() => {
  if (!localConfig.general.isFocusMode) {
    return true
  }
  return !!localConfig.general.focusVisibleWidgetMap[props.widgetCode]
})

const modifyMoveableWrapClass = async (isAdd: boolean, ...clsList: string[]) => {
  if (clsList.length === 0) {
    return
  }
  const el = await ensureTargetContainer()
  if (!el || !el.isConnected) {
    return
  }
  const list = el.classList
  if (!list) {
    return
  }
  for (const cls of clsList) {
    list.toggle(cls, isAdd)
  }
}

// 开启/关闭DragMode时，添加或移除默认样式
watch(isDragMode, (value) => {
  if (!isEnabled.value) {
    return
  }
  if (value) {
    modifyMoveableWrapClass(true, 'widget-auxiliary-line', 'widget-bg-hover')
  } else {
    modifyMoveableWrapClass(false, 'widget-auxiliary-line', 'widget-bg-hover', 'widget-active', 'widget-delete')
  }
})

/**
 * 1. 组件启用时，拖拽模式下，添加active样式
 * 2. 组件关闭时（拖动删除，右键删除），移除组件
 */
watch(
  () => isEnabled.value,
  (value) => {
    if (!value) {
      state.targetContainerEle = null
      return
    }
    // 启用组件，先应用布局样式再加视觉类
    applyContainerLayout()
    if (isDragMode.value) {
      modifyMoveableWrapClass(true, 'widget-auxiliary-line', 'widget-bg-hover', 'widget-active')
    }
  },
)

// 选中当前组件时添加active样式
watch(isCurrentActive, (value) => {
  modifyMoveableWrapClass(value, 'widget-active')
})

// 拖拽/放下组件时，移除/添加组件的hover样式
watch(
  () => moveState.isWidgetStartDrag,
  (value) => {
    if (isCurrentActive.value && isEnabled.value) {
      modifyMoveableWrapClass(!value, 'widget-bg-hover')
    }
  },
)

// 为当前组件添加delete样式
watch(
  () => moveState.isDeleteHover,
  (value) => {
    if (isCurrentActive.value && isEnabled.value) {
      modifyMoveableWrapClass(value, 'widget-delete')
    }
  },
)

const auxiliaryLineWidget = getStyleConst('auxiliaryLineWidget')
const bgMoveableWidgetMain = getStyleConst('bgMoveableWidgetMain')
const bgMoveableWidgetActive = getStyleConst('bgMoveableWidgetActive')
const moveableToolDeleteBtnColor = getStyleConst('moveableToolDeleteBtnColor')
/**
 * widget__wrap div 的style会被用来存放v-bind的css var，不能再进行:style操作
 * id=widgetCode div 用来统一包裹真实的widget，用于drag逻辑的事件委派
 */
</script>

<template>
  <div
    :data-widget-code="props.widgetCode"
    class="widget__wrap"
    :class="{
      'widget__wrap--hidden': !isFocusVisible,
      'widget__wrap--cursor-move': isDragMode
    }"
  >
    <div
      v-if="isEnabled"
      :id="props.widgetCode"
      :data-target-code="props.widgetCode"
      data-target-type="widget"
    >
      <slot />
    </div>
  </div>
</template>

<style>
.widget__wrap {
  --x-offset: v-bind(state.cssVars.xOffset);
  --y-offset: v-bind(state.cssVars.yOffset);
  --x-translate: v-bind(state.cssVars.xTranslate);
  --y-translate: v-bind(state.cssVars.yTranslate);
}

.widget__wrap--hidden {
  opacity: 0;
  pointer-events: none;
}

.widget__wrap--cursor-move {
  cursor: move !important;
}

.widget-auxiliary-line {
  outline: 2px dashed v-bind(auxiliaryLineWidget) !important;
}

.widget-bg-hover:hover {
  background-color: v-bind(bgMoveableWidgetMain) !important;
}

.widget-active {
  background-color: v-bind(bgMoveableWidgetActive) !important;
}

.widget-delete {
  background-color: v-bind(moveableToolDeleteBtnColor) !important;
}
</style>
