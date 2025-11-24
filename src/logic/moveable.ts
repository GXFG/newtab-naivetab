import { useToggle, useThrottleFn } from '@vueuse/core'
import { globalState } from '@/logic/store'

export const [isDragMode, toggleIsDragMode] = useToggle(false)
export const [isDraftDrawerVisible, toggleIsDraftDrawerVisible] = useToggle(true)

export const moveState = reactive({
  width: window.innerWidth,
  height: window.innerHeight,
  // 鼠标事件回调函数map
  mouseDownTaskMap: new Map() as Map<string, (e: MouseEvent, resite?: boolean) => unknown>,
  mouseMoveTaskMap: new Map() as Map<string, (e: MouseEvent) => unknown>,
  mouseUpTaskMap: new Map() as Map<string, (e: MouseEvent) => unknown>,
  isWidgetStartDrag: false, // 是否开始拖动组件，拖动组件时动态悬浮删除icon
  isDeleteHover: false,
  // 辅助线
  isXAxisCenterVisible: false,
  isYAxisCenterVisible: false,
  isTopBoundVisible: false,
  isBottomBoundVisible: false,
  isLeftBoundVisible: false,
  isRightBoundVisible: false,
  // 当前点击组件的属性
  currDragTarget: {
    type: '' as EleTargetType | '',
    code: '' as EleTargetCode | '',
  },
})

let lastIsDraftDrawerVisible: null | boolean = null
let lastFrameId: number | null = null

const onResetMoveState = () => {
  moveState.isWidgetStartDrag = false
  moveState.isDeleteHover = false
  moveState.currDragTarget.type = ''
  moveState.currDragTarget.code = ''
  lastIsDraftDrawerVisible = null
  // 清除可能存在的动画帧
  if (lastFrameId !== null) {
    cancelAnimationFrame(lastFrameId)
    lastFrameId = null
  }
}

export const handleToggleIsDraftDrawerVisible = () => {
  toggleIsDraftDrawerVisible()
  lastIsDraftDrawerVisible = null
}

export const getTargetDataFromEvent = (e: MouseEvent): {
  type: EleTargetType | ''
  code: EleTargetCode | ''
} => {
  let target = e.target as HTMLInputElement
  try {
    while (target && !target.getAttribute('data-target-type')) {
      target = target.parentNode as HTMLInputElement
    }
  } catch (err) {
    // 忽略点击组件外其他区域的报错
    return {
      type: '',
      code: '',
    }
  }
  if (!target || !target.getAttribute) {
    return {
      type: '',
      code: '',
    }
  }
  const type = target.getAttribute('data-target-type') as EleTargetType | ''
  const code = (target.getAttribute('data-target-code') as EleTargetCode) || ''
  return { type, code }
}

const currMouseTaskKey = computed(() => {
  let taskKey = ''
  if (moveState.currDragTarget.type === 'widget') {
    taskKey = moveState.currDragTarget.code
  } else if (moveState.currDragTarget.type === 'draft') {
    taskKey = 'draft-common'
  }
  return taskKey as EleTargetCode
})

const handleMousedown = (e: MouseEvent) => {
  if (globalState.isGuideMode || !isDragMode.value || e.button !== 0) {
    return
  }
  const targetData = getTargetDataFromEvent(e)
  moveState.currDragTarget.type = targetData.type
  moveState.currDragTarget.code = targetData.code
  if (!moveState.currDragTarget.type) {
    return
  }
  const task = moveState.mouseDownTaskMap.get(currMouseTaskKey.value)
  if (task) {
    task(e)
  }
}

const handleMousemove = (e: MouseEvent) => {
  // 取消之前的动画帧请求，避免堆积
  if (lastFrameId !== null) {
    cancelAnimationFrame(lastFrameId)
  }

  lastFrameId = requestAnimationFrame(() => {
    if (globalState.isGuideMode || !isDragMode.value || e.buttons === 0 || !moveState.currDragTarget.type) {
      return
    }
    const task = moveState.mouseMoveTaskMap.get(currMouseTaskKey.value)
    if (task) {
      task(e)
    }
    // 鼠标移动时隐藏draft抽屉
    if (lastIsDraftDrawerVisible === null) {
      lastIsDraftDrawerVisible = isDraftDrawerVisible.value
      if (lastIsDraftDrawerVisible) {
        toggleIsDraftDrawerVisible(false)
      }
    }

    lastFrameId = null
  })
}

const handleMouseup = (e: MouseEvent) => {
  // 取消可能存在的动画帧
  if (lastFrameId !== null) {
    cancelAnimationFrame(lastFrameId)
    lastFrameId = null
  }

  if (globalState.isGuideMode || !isDragMode.value || !moveState.currDragTarget.type) {
    return
  }
  const task = moveState.mouseUpTaskMap.get(currMouseTaskKey.value)
  if (task) {
    task(e)
  }
  // 鼠标抬起时根据上一次状态决定是否打开Element抽屉
  if (lastIsDraftDrawerVisible) {
    toggleIsDraftDrawerVisible(true)
    lastIsDraftDrawerVisible = null
  }
}

const mouseTaskMap = {
  mousedown: handleMousedown,
  mousemove: useThrottleFn(handleMousemove, 5),
  mouseup: handleMouseup,
  mouseleave: handleMouseup,
}

const handleMouseTaskListener = (isInit: boolean) => {
  const bodyEle = document.querySelector('body') as HTMLElement
  if (!bodyEle) {
    return
  }
  const eventListenerFunc = isInit ? bodyEle.addEventListener : bodyEle.removeEventListener
  for (const eventName of Object.keys(mouseTaskMap)) {
    eventListenerFunc(eventName, mouseTaskMap[eventName])
  }
}

watch(
  isDragMode,
  (value) => {
    if (!value) {
      handleMouseTaskListener(false)
      onResetMoveState()
      return
    }
    // 开启编辑布局时默认打开draft抽屉
    toggleIsDraftDrawerVisible(true)
    nextTick(() => {
      handleMouseTaskListener(true)
    })
  },
  { immediate: true },
)

export const cleanupEvents = () => {
  handleMouseTaskListener(false)
  onResetMoveState()
}

/**
 * window.innerWidth 属于 Layout 属性，频繁读取可能触发浏览器重排，导致性能问题
 * 缓存后速度提升大约30%（Chrome 118 测试）
 */
const updateWindowSize = () => {
  moveState.width = window.innerWidth
  moveState.height = window.innerHeight
}

const handleUpdateWindowSize = useThrottleFn(() => {
  updateWindowSize()
}, 100)

// 使用ResizeObserver代替window.resize事件，性能更好
let resizeObserver: ResizeObserver | null = null

if (typeof ResizeObserver !== 'undefined') {
  resizeObserver = new ResizeObserver(handleUpdateWindowSize)
  resizeObserver.observe(document.documentElement)
} else {
  // 降级方案
  window.addEventListener('resize', handleUpdateWindowSize)
}

// 确保在组件卸载时清理ResizeObserver
export const cleanupResizeObserver = () => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  } else {
    window.removeEventListener('resize', handleUpdateWindowSize)
  }
}
