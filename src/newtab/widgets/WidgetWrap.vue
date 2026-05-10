<script setup lang="ts">
import { DRAG_TRIGGER_DISTANCE } from '@/logic/constants/app'
import { moveState, isDragMode } from '@/logic/moveable'
import { localConfig, localState } from '@/logic/store'

const props = defineProps({
  widgetCode: {
    type: String as PropType<WidgetCodes>,
    required: true,
  },
})

// 拖动位置 CSS 变量通过 :style 注入，避免 v-bind() TDZ 错误
const widgetStyle = computed(() => ({
  '--nt-x-offset': state.cssVars.xOffset,
  '--nt-y-offset': state.cssVars.yOffset,
  '--nt-x-translate': state.cssVars.xTranslate,
  '--nt-y-translate': state.cssVars.yTranslate,
}))

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
  /**
   * 拖动位置的 CSS 变量值（高频更新层）
   *
   * 设计说明 - 拖动样式分两层更新，职责分离：
   *
   * 【第一层：高频，每帧执行】更新 CSS 变量的「值」
   *   - 作用元素：widget__wrap（Vue 管理的父 div）
   *   - 操作方式：修改此处的 cssVars → 由 v-bind 写入 CSS 变量（--x-offset 等）
   *   - 每帧拖动时只更新 4 个 JS 字符串，Vue 在下一次 flush 时批量写入 CSS 变量
   *
   * 【第二层：低频，仅 key 切换时执行】更新 container 的「属性名」
   *   - 作用元素：xxx__container（手动管理的子 div）
   *   - 操作方式：el.style.left/right/top/bottom = 'var(--nt-x-offset)' 直接 DOM 操作
   *   - 仅当 left ↔ right 或 top ↔ bottom 发生切换时才执行，正常拖动中此分支不触发
   *
   * 关键点：container 的 left/right 值引用 var(--nt-x-offset)，
   * 而 --x-offset 定义在父级 widget__wrap 上，CSS 变量天然继承，
   * 两层操作目标元素不同、属性不同，不存在竞争关系。
   * 这样做将「频繁变化的数值」与「低频变化的方向结构」分离，
   * 大幅减少 el.style 直接写入次数，降低浏览器样式重算开销。
   */
  cssVars: {
    xOffset: '0',
    yOffset: '0',
    xTranslate: '0',
    yTranslate: '0',
  },
  // 缓存上一次的 xOffsetKey/yOffsetKey，避免每帧都执行第二层 el.style 操作
  lastXOffsetKey: '',
  lastYOffsetKey: '',
})

const offsetData = reactive({
  xOffsetKey: '',
  xOffsetValue: null as number | null,
  xTranslateValue: null as number | null,
  yOffsetKey: '',
  yOffsetValue: null as number | null,
  yTranslateValue: null as number | null,
})

const getPercentageInWidth = (currWidth: number) =>
  +((currWidth / moveState.width) * 100).toFixed(5)
const getPercentageInHeight = (currHeight: number) =>
  +((currHeight / moveState.height) * 100).toFixed(5)

const ensureTargetContainer = async (): Promise<HTMLElement | null> => {
  await nextTick()
  if (!state.targetContainerEle) {
    state.targetContainerEle = document.querySelector(
      `.${props.widgetCode}__container`,
    )
  }
  return state.targetContainerEle as HTMLElement | null
}

/**
 * 同步版本的 getTargetContainer，用于高频拖动回调，避免 async/await 的微任务开销
 */
const getTargetContainerSync = (): HTMLElement | null => {
  if (!state.targetContainerEle) {
    state.targetContainerEle = document.querySelector(
      `.${props.widgetCode}__container`,
    )
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
    localConfig[props.widgetCode].layout.xOffsetValue =
      getPercentageInWidth(offsetLeft)
    localConfig[props.widgetCode].layout.yOffsetValue =
      getPercentageInHeight(offsetTop)
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
  el.style.setProperty(
    'transform',
    `translate(${layout.xTranslateValue}%, ${layout.yTranslateValue}%)`,
  )
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
  if (offsetData.xOffsetValue !== null) {
    localConfig[props.widgetCode].layout.xOffsetValue = offsetData.xOffsetValue
  }
  if (offsetData.yOffsetValue !== null) {
    localConfig[props.widgetCode].layout.yOffsetValue = offsetData.yOffsetValue
  }
  if (offsetData.xTranslateValue !== null) {
    localConfig[props.widgetCode].layout.xTranslateValue =
      offsetData.xTranslateValue
  }
  if (offsetData.yTranslateValue !== null) {
    localConfig[props.widgetCode].layout.yTranslateValue =
      offsetData.yTranslateValue
  }
  state.lastXOffsetKey = ''
  state.lastYOffsetKey = ''
  scheduleApplyContainerLayout()
}

const onDragging = (e: MouseEvent) => {
  // 同步获取容器元素，避免高频拖动中的 async/await 微任务开销
  const el = getTargetContainerSync()
  if (!el) {
    return
  }
  const mouseDiffX = e.clientX - state.startState.clientX
  const mouseDiffY = e.clientY - state.startState.clientY
  offsetData.xOffsetKey = ''
  offsetData.yOffsetKey = ''
  offsetData.xOffsetValue = state.startState.left + mouseDiffX
  offsetData.yOffsetValue = state.startState.top + mouseDiffY
  offsetData.xTranslateValue = null
  offsetData.yTranslateValue = null

  const xCenterLine = moveState.width / 2
  const yCenterLine = moveState.height / 2
  const targetCenterX = offsetData.xOffsetValue + state.startState.width / 2
  const targetCenterY = offsetData.yOffsetValue + state.startState.height / 2

  if (offsetData.xOffsetValue <= xCenterLine) {
    offsetData.xOffsetKey = 'left'
    offsetData.xOffsetValue = getPercentageInWidth(offsetData.xOffsetValue)
  } else {
    offsetData.xOffsetKey = 'right'
    offsetData.xOffsetValue = getPercentageInWidth(
      moveState.width - state.startState.width - offsetData.xOffsetValue,
    )
  }
  if (offsetData.yOffsetValue <= yCenterLine) {
    offsetData.yOffsetKey = 'top'
    offsetData.yOffsetValue = getPercentageInHeight(offsetData.yOffsetValue)
  } else {
    offsetData.yOffsetKey = 'bottom'
    offsetData.yOffsetValue = getPercentageInHeight(
      moveState.height - state.startState.height - offsetData.yOffsetValue,
    )
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
  // 注意：边界检查在居中吸附之后，若边界触碰需同步重置 translate，防止组件被偏移到屏幕外
  if ((offsetData.xOffsetValue as number) < 0) {
    offsetData.xOffsetValue = 0
    offsetData.xTranslateValue = 0
    if (offsetData.xOffsetKey === 'left') {
      moveState.isLeftBoundVisible = true
      moveState.isRightBoundVisible = false
    } else {
      moveState.isRightBoundVisible = true
      moveState.isLeftBoundVisible = false
    }
  } else {
    moveState.isLeftBoundVisible = false
    moveState.isRightBoundVisible = false
  }
  if ((offsetData.yOffsetValue as number) < 0) {
    offsetData.yOffsetValue = 0
    offsetData.yTranslateValue = 0
    if (offsetData.yOffsetKey === 'top') {
      moveState.isTopBoundVisible = true
      moveState.isBottomBoundVisible = false
    } else {
      moveState.isBottomBoundVisible = true
      moveState.isTopBoundVisible = false
    }
  } else {
    moveState.isTopBoundVisible = false
    moveState.isBottomBoundVisible = false
  }

  // 第一层（高频）：更新 CSS 变量的值，由 v-bind 批量写入 widget__wrap
  state.cssVars.xOffset = `${offsetData.xOffsetValue ?? 0}vw`
  state.cssVars.yOffset = `${offsetData.yOffsetValue ?? 0}vh`
  state.cssVars.xTranslate = `${offsetData.xTranslateValue ?? 0}%`
  state.cssVars.yTranslate = `${offsetData.yTranslateValue ?? 0}%`

  // 第二层（低频）：仅当方向 key 发生切换（left ↔ right / top ↔ bottom）时，
  // 才直接操作 container 的 el.style，将 left/right 指向对应的 CSS 变量。
  // 停止拖动后由 scheduleApplyContainerLayout 将最终位置写入 localConfig。
  if (
    !state.lastXOffsetKey ||
    !state.lastYOffsetKey ||
    state.lastXOffsetKey !== offsetData.xOffsetKey ||
    state.lastYOffsetKey !== offsetData.yOffsetKey
  ) {
    // 只在 xOffsetKey 或 yOffsetKey 值变化时才触发更新dragStyle
    if (offsetData.xOffsetKey === 'left') {
      el.style.left = 'var(--nt-x-offset)'
      el.style.right = ''
    } else {
      el.style.right = 'var(--nt-x-offset)'
      el.style.left = ''
    }
    if (offsetData.yOffsetKey === 'top') {
      el.style.top = 'var(--nt-y-offset)'
      el.style.bottom = ''
    } else {
      el.style.bottom = 'var(--nt-y-offset)'
      el.style.top = ''
    }
    el.style.transform =
      'translate(var(--nt-x-translate), var(--nt-y-translate))'
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

const isCurrentActive = computed(
  () => props.widgetCode === moveState.currDragTarget.code,
)

const isFocusVisible = computed(() => {
  if (!localState.value.isFocusMode) {
    return true
  }
  return !!localConfig.general.focusVisibleWidgetMap[props.widgetCode]
})

const modifyMoveableWrapClass = (isAdd: boolean, ...clsList: string[]) => {
  if (clsList.length === 0) {
    return
  }
  const el = document.querySelector(`.${props.widgetCode}__container`)
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
    modifyMoveableWrapClass(
      false,
      'widget-auxiliary-line',
      'widget-bg-hover',
      'widget-active',
      'widget-delete',
      'widget-dragging',
    )
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
      modifyMoveableWrapClass(
        true,
        'widget-auxiliary-line',
        'widget-bg-hover',
        'widget-active',
      )
    }
  },
)

// 选中当前组件时添加active样式
watch(isCurrentActive, (value) => {
  modifyMoveableWrapClass(value, 'widget-active')
})

// 拖拽/放下组件时，移除/添加组件的hover样式，并切换拖动提升效果
watch(
  () => moveState.isWidgetStartDrag,
  (value) => {
    if (isCurrentActive.value && isEnabled.value) {
      modifyMoveableWrapClass(!value, 'widget-bg-hover')
      modifyMoveableWrapClass(value, 'widget-dragging')
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

/**
 * widget__wrap div 的style会被用来存放v-bind的css var，不能再进行:style操作
 */
</script>

<template>
  <div
    :data-widget-code="props.widgetCode"
    class="widget__wrap"
    :class="{
      'widget__wrap--hidden': !isFocusVisible,
      'widget__wrap--cursor-move': isDragMode,
    }"
    :style="widgetStyle"
  >
    <div
      v-if="isEnabled"
      :id="props.widgetCode"
      :data-target-code="props.widgetCode"
      data-target-type="widget"
      class="widget__root"
    >
      <slot />
    </div>
  </div>
</template>

<style>
.widget__wrap {
  --x-offset: 0;
  --y-offset: 0;
  --x-translate: 0;
  --y-translate: 0;
  --nt-auxiliary-line-widget: rgba(0, 0, 0, 0);
  --nt-bg-moveable-widget-main: rgba(0, 0, 0, 0);
  --nt-bg-moveable-widget-active: rgba(0, 0, 0, 0);
  --nt-moveable-tool-delete-btn-color: rgba(0, 0, 0, 0);
}

.widget__wrap--hidden {
  opacity: 0;
  pointer-events: none;
}

.widget__wrap--cursor-move {
  cursor: move !important;
}

/* 拖动编辑模式 — 辅助线轮廓 */
.widget-auxiliary-line {
  outline: 2px dashed var(--nt-auxiliary-line-widget) !important;
  outline-offset: 2px;
  border-radius: 4px;
}

/* 非激活状态的 hover 高亮 */
.widget-bg-hover:hover {
  background-color: var(--nt-bg-moveable-widget-main);
  box-shadow: 0 2px 12px rgba(100, 181, 246, 0.25);
}

/* 当前选中（mousedown）激活态 */
.widget-active {
  background-color: var(--nt-bg-moveable-widget-active) !important;
  box-shadow: 0 4px 16px rgba(100, 181, 246, 0.35) !important;
}

/* 拖动进行中 */
.widget-dragging {
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.28),
    0 2px 8px rgba(100, 181, 246, 0.3) !important;
  opacity: 0.92 !important;
  transition:
    box-shadow 150ms ease,
    opacity 150ms ease !important;
}

/* 拖入删除区域 — 红色警示 + 脉冲动画 */
.widget-delete {
  background-color: var(--nt-moveable-tool-delete-btn-color) !important;
  box-shadow: 0 4px 24px rgba(255, 80, 80, 0.55) !important;
  animation: widget-delete-pulse 1.2s ease-in-out infinite !important;
  transition:
    background-color 200ms ease,
    box-shadow 200ms ease !important;
}

@keyframes widget-delete-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 4px 24px rgba(255, 80, 80, 0.55) !important;
    opacity: 1 !important;
  }
  50% {
    transform: scale(0.96);
    box-shadow: 0 6px 32px rgba(255, 60, 60, 0.7) !important;
    opacity: 0.88 !important;
  }
}
</style>
