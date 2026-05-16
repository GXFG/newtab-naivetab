/**
 * @module moveable
 * @description 拖拽定位与编辑布局系统 — Widget 拖拽、辅助线、删除动画、窗口 resize 监听。
 * @dependencies constants/app.ts（DRAG_TRIGGER_DISTANCE）、config/state.ts（localConfig）、store/state.ts（globalState）
 * @consumers WidgetWrap.vue（注册 mousedown/mousemove/mouseup 任务）、Content.vue（isDragMode 入口）
 * @pitfalls
 *   - moveState.mouseDownTaskMap 等是 Map 结构，WidgetWrap 在 onMounted 时注册，onUnmounted 时注销
 *   - handleMousemove 使用 requestAnimationFrame 节流，坐标通过代理对象传入（clientX/clientY/buttons），避免 event 对象被复用
 *   - window.innerWidth 用 ResizeObserver 缓存而非直接读取，避免频繁重排（性能提升 ~30%）
 *   - 删除动画（animateDeleteWidget）使用 transform: scale(0.3) + opacity: 0，动画结束后才设置 enabled=false
 * @see docs/architecture/moveable.md
 */
import { useToggle, useThrottleFn } from '@vueuse/core'
import { gaProxy } from '@/logic/utils/gtag'
import { localConfig } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'

export const [isDragMode, toggleIsDragMode] = useToggle(false)
export const [isDraftDrawerVisible, toggleIsDraftDrawerVisible] =
  useToggle(true)

export const moveState = reactive({
  width: window.innerWidth,
  height: window.innerHeight,
  // 鼠标事件回调函数map
  // mouseDownTask 可能是 async 函数（如 startDrag），使用 Promise<void> | void 确保 await 可正确等待
  mouseDownTaskMap: new Map() as Map<
    string,
    (e: MouseEvent, resite?: boolean) => Promise<void> | void
  >,
  mouseMoveTaskMap: new Map() as Map<string, (e: MouseEvent) => void>,
  mouseUpTaskMap: new Map() as Map<string, (e: MouseEvent) => void>,
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

export const getTargetDataFromEvent = (
  e: MouseEvent,
): {
  type: EleTargetType | ''
  code: EleTargetCode | ''
} => {
  const empty = { type: '' as const, code: '' as const }
  let target = e.target
  while (target) {
    // 只在 Element 节点上调用 getAttribute，跳过 TextNode / Document 等非元素节点
    if (!(target instanceof Element)) {
      return empty
    }
    if (target.getAttribute('data-target-type')) {
      break
    }
    target = target.parentNode
  }
  if (!target || !(target instanceof Element)) {
    return empty
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

const handleMousedown = async (e: MouseEvent) => {
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
    await task(e)
  }
}

const handleMousemove = (e: MouseEvent) => {
  if (
    globalState.isGuideMode ||
    !isDragMode.value ||
    e.buttons === 0 ||
    !moveState.currDragTarget.type
  ) {
    return
  }

  // 取消之前的动画帧请求，避免堆积
  if (lastFrameId !== null) {
    cancelAnimationFrame(lastFrameId)
  }

  // 捕获当前事件坐标，避免 rAF 回调时 event 对象已更新
  const clientX = e.clientX
  const clientY = e.clientY
  const buttons = e.buttons

  lastFrameId = requestAnimationFrame(() => {
    lastFrameId = null
    if (!isDragMode.value || buttons === 0 || !moveState.currDragTarget.type) {
      return
    }
    const task = moveState.mouseMoveTaskMap.get(currMouseTaskKey.value)
    if (task) {
      // 构造一个轻量代理对象，避免重新创建完整 MouseEvent
      task({ clientX, clientY, buttons } as MouseEvent)
    }
    // 鼠标移动时隐藏draft抽屉
    if (lastIsDraftDrawerVisible === null) {
      lastIsDraftDrawerVisible = isDraftDrawerVisible.value
      if (lastIsDraftDrawerVisible) {
        toggleIsDraftDrawerVisible(false)
      }
    }
  })
}

const handleMouseup = (e: MouseEvent) => {
  // 取消可能存在的动画帧
  if (lastFrameId !== null) {
    cancelAnimationFrame(lastFrameId)
    lastFrameId = null
  }

  if (
    globalState.isGuideMode ||
    !isDragMode.value ||
    !moveState.currDragTarget.type
  ) {
    return
  }

  // 检查鼠标是否在删除区域内（防止鼠标移出后 delete icon 缩回导致 isDeleteHover 丢失）
  const isInDeleteZone =
    moveState.isWidgetStartDrag &&
    e.clientX > moveState.width - 100 &&
    e.clientY < 100
  if (isInDeleteZone && moveState.currDragTarget.type === 'widget') {
    animateDeleteWidget(moveState.currDragTarget.code as WidgetCodes)
    gaProxy('delete', ['widget', moveState.currDragTarget.code], {
      enabled: false,
    })
    moveState.isWidgetStartDrag = false
    moveState.currDragTarget.type = ''
    moveState.currDragTarget.code = ''
    // 重置状态，确保鼠标抬起时能恢复抽屉
    if (lastIsDraftDrawerVisible) {
      toggleIsDraftDrawerVisible(true)
      lastIsDraftDrawerVisible = null
    }
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
  mousemove: handleMousemove,
  mouseup: handleMouseup,
  mouseleave: handleMouseup,
}

const handleMouseTaskListener = (isInit: boolean) => {
  const bodyEle = document.querySelector('body') as HTMLElement
  if (!bodyEle) {
    return
  }
  for (const eventName of Object.keys(mouseTaskMap)) {
    if (isInit) {
      bodyEle.addEventListener(eventName, mouseTaskMap[eventName])
    } else {
      bodyEle.removeEventListener(eventName, mouseTaskMap[eventName])
    }
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
 * 删除 widget 时的消失动画：缩小 + 淡出，动画结束后设置 enabled = false
 */
export const animateDeleteWidget = (code: WidgetCodes) => {
  const container = document.querySelector(
    `.${code}__container`,
  ) as HTMLElement | null
  if (container) {
    const currentTransform = container.style.transform || ''
    container.style.transition =
      'transform 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms ease'
    container.style.transform = currentTransform
      ? `${currentTransform} scale(0.3)`
      : 'scale(0.3)'
    container.style.opacity = '0'
  }
  setTimeout(() => {
    localConfig[code].enabled = false
  }, 260)
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
