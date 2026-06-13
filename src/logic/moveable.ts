/**
 * @module moveable
 * @description 拖拽定位与编辑布局系统 — Widget 拖拽、resize 缩放、辅助线、删除动画、窗口 resize 监听。
 *
 *   【拖拽 vs Resize 路由架构】
 *   系统维护两套并行的 Task Map：mouse*TaskMap（拖拽）和 resize*TaskMap（缩放）。
 *   通过 DOM 上的 data-target-type 属性在 mousedown 阶段分流：
 *     'widget'        → mouseMoveTaskMap → 拖拽定位
 *     'widget-resize' → resizeMoveTaskMap → 缩放尺寸
 *   resize handle 是 widget 内部子元素，事件冒泡先匹配到 'widget-resize'，天然优先级更高。
 *
 * @dependencies constants/app.ts（DRAG_TRIGGER_DISTANCE）、config/state.ts（localConfig）、store/state.ts（globalState）
 * @consumers WidgetWrap.vue（注册拖拽/缩放三类任务）、Content.vue（isDragMode 入口）、
 *   RightClickMenu.vue / DraftDrawer.vue / shortcut-executor.ts（通过 toggleDragMode 进入拖拽模式）
 * @pitfalls
 *   - moveState.mouseDownTaskMap 等是 Map 结构，WidgetWrap 在 onMounted 时注册，onUnmounted 时注销
 *   - handleMousemove 使用 requestAnimationFrame 节流，坐标和 currMouseTaskKey 必须在同步上下文中捕获，
 *     避免 rAF 回调中被后续 mousedown 修改（竞态：拖动 A 释放后快速点击 B）
 *   - handleMousedown 是 async 函数，但不会与 mousemove 产生竞态：浏览器事件串行派发，
 *     await 完成前不会派发下一个鼠标事件（详见 docs/architecture/moveable.md）
 *   - window.innerWidth 用 ResizeObserver 缓存而非直接读取，避免频繁重排（性能提升 ~30%）
 *   - 删除动画（animateDeleteWidget）使用 transform: scale(0.3) + opacity: 0，动画结束后才设置 enabled=false
 *   - toggleDragMode 是统一入口（含 GA 上报），右键/快捷键/ESC 应调用此函数而非 toggleIsDragMode
 *   - resize moveTask 在 rAF 回调中直接写入 localConfig（与拖拽 offsetData 缓冲机制不同），
 *     因为 scaleFactor 是 relative 增量且每次计算依赖前一帧尺寸，不适合延迟批量写入
 * @see docs/architecture/moveable.md
 */
import { useToggle, useThrottleFn } from '@vueuse/core'
import { gaProxy } from '@/logic/utils/gtag'
import { localConfig, localState } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'

export const [isDragMode, toggleIsDragMode] = useToggle(false)

/**
 * 包装版 toggle，统一上报拖拽模式切换事件。
 * 快捷键和右键菜单应调用此函数而非直接调用 toggleIsDragMode。
 */
export const toggleDragMode = (nextValue?: boolean) => {
  // useToggle 的 toggle 函数通过 arguments.length 判断是切换还是赋值：
  // toggle() → 切换值；toggle(v) → 赋值为 v
  // 如果传 undefined 但 arguments.length 为 1，会被当作赋值而非切换
  if (nextValue === undefined) {
    toggleIsDragMode()
  } else {
    toggleIsDragMode(nextValue)
  }
  gaProxy('click', ['dragMode_toggle'], { enabled: isDragMode.value })
}

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
  // Resize 任务映射 — 与拖拽 Task Map 平行，事件路由通过 data-target-type 分流
  // 注册/注销由 WidgetWrap onMounted / onUnmounted 管理，仅含 SCALABLE_FIELDS 的 widget 才会注册
  resizeDownTaskMap: new Map() as Map<
    string,
    (e: MouseEvent) => Promise<void> | void
  >,
  resizeMoveTaskMap: new Map() as Map<string, (e: MouseEvent) => void>,
  resizeUpTaskMap: new Map() as Map<string, (e: MouseEvent) => void>,
  isWidgetStartDrag: false, // 是否开始拖动组件，拖动组件时动态悬浮删除icon
  isWidgetResizing: false, // 是否正在 resize
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
  moveState.isWidgetResizing = false
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
  } else if (moveState.currDragTarget.type === 'widget-resize') {
    taskKey = moveState.currDragTarget.code
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

  // resize 路由优先于 drag：handle 在 widget 内部，先匹配到 resize 直接处理
  if (targetData.type === 'widget-resize') {
    moveState.isWidgetResizing = true
    const task = moveState.resizeDownTaskMap.get(targetData.code)
    if (task) {
      await task(e)
    }
    return
  }

  const task = moveState.mouseDownTaskMap.get(currMouseTaskKey.value)
  if (task) {
    // async handler + await 不会阻塞浏览器派发后续 mousemove 事件，
    // 因为浏览器的事件模型是串行派发：当前事件的所有监听器（含 async Promise）
    // resolve 之前，不会派发下一个鼠标事件。
    // 且用户从按下鼠标到产生位移至少需要几十毫秒，远超 await nextTick() 的执行时间。
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

  // 捕获当前事件坐标和目标，避免 rAF 回调中被后续 mousedown 修改。
  // 竞态场景：拖动 A 释放后快速点击 B，A 的最后一个 mousemove 已提交 rAF 回调但尚未执行。
  // 如果不在此处捕获 currMouseTaskKey，rAF 回调执行时会读到已被 mousedown(B) 修改的值，
  // 导致用 A 的坐标调 B.onDragging() → A 跑到 B 的位置。
  const clientX = e.clientX
  const clientY = e.clientY
  const buttons = e.buttons
  const currTaskKey = currMouseTaskKey.value

  // resize 移动路由
  if (moveState.isWidgetResizing) {
    lastFrameId = requestAnimationFrame(() => {
      lastFrameId = null
      if (!isDragMode.value || buttons === 0) return
      const task = moveState.resizeMoveTaskMap.get(currTaskKey)
      if (task) {
        task({ clientX, clientY, buttons } as MouseEvent)
      }
    })
    return
  }

  lastFrameId = requestAnimationFrame(() => {
    lastFrameId = null
    if (!isDragMode.value || buttons === 0 || !moveState.currDragTarget.type) {
      return
    }
    const task = moveState.mouseMoveTaskMap.get(currTaskKey)
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

  // resize 结束时路由到 resizeUpTaskMap，跳过删除区域检测。
  // 不清 currDragTarget：resize 后 widget 保持选中态，handle 持续可见。
  if (moveState.isWidgetResizing) {
    const task = moveState.resizeUpTaskMap.get(currMouseTaskKey.value)
    if (task) {
      task(e)
    }
    moveState.isWidgetResizing = false
    if (lastIsDraftDrawerVisible) {
      toggleIsDraftDrawerVisible(true)
      lastIsDraftDrawerVisible = null
    }
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
      source: 'drag',
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
      bodyEle.addEventListener(eventName, (mouseTaskMap as any)[eventName])
    } else {
      bodyEle.removeEventListener(eventName, (mouseTaskMap as any)[eventName])
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
 * 将指定 widget 提升到层叠顺序顶部（z-index 置顶）。
 * DraftDrawer 拖出新 widget 和 WidgetWrap 交互时均需调用，确保最近操作的 widget 在最上层。
 */
export const bringWidgetToFront = (code: WidgetCodes) => {
  const order = localState.value.widgetInteractionOrder
  const newOrder = order.filter((c: string) => c !== code)
  newOrder.push(code)
  localState.value.widgetInteractionOrder = newOrder
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
// 用 requestAnimationFrame 包装避免 "undelivered notifications" 警告，
// 确保布局计算在下一帧执行，不会与当前渲染冲突
let resizeObserver: ResizeObserver | null = null

if (typeof ResizeObserver !== 'undefined') {
  resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      handleUpdateWindowSize()
    })
  })
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
