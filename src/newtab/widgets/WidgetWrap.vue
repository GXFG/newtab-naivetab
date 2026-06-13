<script setup lang="ts">
/**
 * @module WidgetWrap
 * @description Widget 包裹组件，提供定位（CSS 变量注入）、拖拽（注册到 moveState）、
 *   resize 缩放（SCALABLE_FIELD_REGISTRY 驱动）、专注模式可见性控制。
 *   编辑模式下 resize handle 在点击选中或 hover 时显示（isCurrentActive || isHovered）。
 * @dependencies logic/moveable.ts（moveState、isDragMode、resize*TaskMap）、logic/config/state.ts（localConfig/localState）、
 *   newtab/widgets/scalable-registry.ts（SCALABLE_FIELD_REGISTRY）
 * @consumers 所有 Widget 的根组件（必须用此组件包裹）
 * @pitfalls
 *   - widget__wrap div 的 :style 已被 widgetStyle 用于注入定位 CSS 变量，禁止再 :style 绑定
 *   - 拖动样式分两层：高频 CSS 变量值更新（widgetStyle）vs 低频 el.style 方向 key 切换（applyContainerLayout）
 *   - stopDrag 后通过 scheduleApplyContainerLayout 在 rAF 中写入 localConfig，避免连续布局写入
 *   - 组件 enabled=false 时需重置 targetContainerEle，否则下次启用时可能指向已销毁的 DOM
 *   - resize 回调（startResize/onResizing/stopResize）与拖拽回调注册到不同的 Task Map，
 *     moveable.ts 通过 data-target-type 在 mousedown 阶段路由分流
 *   - resize handle 通过原生 DOM API append 到 __container 内，不被 Vue vdom 管理，
 *     onUpdated + watch(shouldShowHandle) 双重保障重建被 vdom diff 移除的 handle
 *   - isHovered 在编辑模式下控制 handle 显隐，进入拖拽模式时需同步检查 onUpdated 时
 *     isHovered 状态（watch(isDragMode) 中补充添加 widget-hover class），
 *     避免鼠标已在 widget 上时开启编辑模式后 handle 不显示
 * @see docs/widgets/widget-dev.md#WidgetWrap-深度解析
 * @see docs/architecture/moveable.md
 */
import { DRAG_TRIGGER_DISTANCE } from '@/logic/constants/app'
import { moveState, isDragMode, bringWidgetToFront } from '@/logic/moveable'
import { localConfig, localState } from '@/logic/config/state'
import { SCALABLE_FIELD_REGISTRY } from '@/newtab/widgets/scalable-registry'
import type { TScalableFieldsMap } from '@/newtab/widgets/scalable-registry'

const props = defineProps({
  widgetCode: {
    type: String as PropType<WidgetCodes>,
    required: true,
  },
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

/** hover 时临时浮起，不改交互顺序。拖拽模式下不触发。 */
const isHovered = ref(false)

/**
 * 层叠管理：基于交互顺序 + hover 状态动态计算 z-index。
 *
 * 规则：
 *   - 从未交互过的 Widget → z-index: 10
 *   - 交互过的 Widget → 10 + index，最近交互层级最高
 *   - hover 时临时 +100，离开恢复。拖拽模式下不生效
 *
 * @see src/logic/config/defaults.ts defaultLocalState.widgetInteractionOrder
 */
const zIndex = computed(() => {
  const order = localState.value.widgetInteractionOrder
  const index = order.indexOf(props.widgetCode)
  const base = index === -1 ? 10 : 10 + index
  return isHovered.value && !isDragMode.value ? base + 100 : base
})

const handleWidgetHoverEnter = () => {
  isHovered.value = true
}
const handleWidgetHoverLeave = () => {
  isHovered.value = false
}

/** 拖拽模式下也需要触发层级变化，复用 moveable.ts 中的置顶逻辑 */
const handleWidgetInteract = () => {
  bringWidgetToFront(props.widgetCode)
}

/** 在 container 上绑定/解绑交互监听。container 是实际有体积的定位元素。 */
const toggleInteractListener = (add: boolean) => {
  const el = getTargetContainerSync()
  if (!el) return
  const op = add ? 'addEventListener' : 'removeEventListener'
  el[op]('mousedown', handleWidgetInteract)
  el[op]('mouseenter', handleWidgetHoverEnter)
  el[op]('mouseleave', handleWidgetHoverLeave)
}

// 拖动位置 + 层叠管理 CSS 变量通过 :style 注入到 widget__wrap，
// 子元素通过 CSS 变量继承获取值（与 --nt-x-offset 等模式一致）。
const widgetStyle = computed(() => ({
  '--nt-x-offset': state.cssVars.xOffset,
  '--nt-y-offset': state.cssVars.yOffset,
  '--nt-x-translate': state.cssVars.xTranslate,
  '--nt-y-translate': state.cssVars.yTranslate,
  '--nt-z-index': zIndex.value,
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
   *   - 操作方式：修改此处的 cssVars → 通过 :style 写入 CSS 变量（--nt-x-offset 等）
   *   - 每帧拖动时只更新 4 个 JS 字符串，Vue 在下一次 flush 时批量写入 CSS 变量
   *
   * 【第二层：低频，仅 key 切换时执行】更新 container 的「属性名」
   *   - 作用元素：xxx__container（手动管理的子 div）
   *   - 操作方式：el.style.left/right/top/bottom = 'var(--nt-x-offset)' 直接 DOM 操作
   *   - 仅当 left ↔ right 或 top ↔ bottom 发生切换时才执行，正常拖动中此分支不触发
   *
   * 关键点：container 的 left/right 值引用 var(--nt-x-offset)，
   * 而 --nt-x-offset 定义在父级 widget__wrap 上，CSS 变量天然继承，
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

  // 第一层（高频）：更新 CSS 变量的值，通过 widgetStyle 写入 widget__wrap
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

// ──────────────────────────────────────────────────────────────────────────────
// Resize 生命周期（与位置拖拽并行，使用独立的 resize*TaskMap）
// ──────────────────────────────────────────────────────────────────────────────

const resizeStartState = reactive({
  clientX: 0,
  clientY: 0,
  rect: { width: 0, height: 0 } as { width: number; height: number },
  /** mousedown 时刻所有可缩放字段值的快照，用于增量计算时作为基准 */
  fieldValues: {} as Record<string, number>,
  /**
   * 当前 widget 的可缩放字段定义。null 作为 sentinel：
   * onResizing 中检查 `if (!fields) return` 来阻止缩放计算。
   * stopResize 将其设为 null 来停止后续 mousemove 处理。
   * 其余字段（clientX/clientY/rect/fieldValues）不清零是安全的，
   * 因为它们仅在 fields 非 null 时被读取。
   */
  fields: null as TScalableFieldsMap | null,
})

/**
 * 根据 scalableFieldDef.configSection 读取字段当前值。
 * 默认从 localConfig[widgetCode] 读取，configSection 存在则从 localConfig[section] 读取。
 * 支持点分隔嵌套路径（如 'style.fontSize'）。
 */
const readScalableFieldValue = (
  field: string,
  def: TScalableFieldsMap[string],
): number | undefined => {
  const section = (def.configSection || props.widgetCode) as ConfigField
  const fieldList = field.split('.')
  // 运行时动态路径遍历，any 是必要的：localConfig 的 section 类型是 union，
  // reduce 返回值无法在编译期精确推导到叶子字段类型
  const val = fieldList.reduce((r: any, c) => r[c], localConfig[section])
  return typeof val === 'number' ? val : undefined
}

/**
 * 根据 scalableFieldDef.configSection 写入字段值到 localConfig。
 * 与 read 对称：默认写 localConfig[widgetCode]，configSection 存在则写 localConfig[section]。
 * 支持点分隔嵌套路径。reduce 中 any 原因同 read。
 */
const writeScalableFieldValue = (
  field: string,
  def: TScalableFieldsMap[string],
  value: number,
) => {
  const section = (def.configSection || props.widgetCode) as ConfigField
  const fieldList = field.split('.')
  let target: any = localConfig[section]
  for (let i = 0; i < fieldList.length - 1; i++) {
    target = target[fieldList[i]]
  }
  target[fieldList[fieldList.length - 1]] = value
}

/**
 * Resize 启动：快照容器尺寸和所有可缩放字段的当前值。
 * mousedown 在 resize handle 上触发，moveable.ts 已将 isWidgetResizing 设为 true。
 */
const startResize = async (e: MouseEvent) => {
  const el = await ensureTargetContainer()
  if (!el) return

  const rect = el.getBoundingClientRect()
  resizeStartState.clientX = e.clientX
  resizeStartState.clientY = e.clientY
  resizeStartState.rect = { width: rect.width, height: rect.height }

  const fields = SCALABLE_FIELD_REGISTRY[props.widgetCode as WidgetCodes]
  if (!fields) return
  resizeStartState.fields = fields

  // 快照所有可缩放字段的当前值，作为增量计算的基准
  resizeStartState.fieldValues = {}
  for (const [field, def] of Object.entries(fields)) {
    const value = readScalableFieldValue(field, def)
    if (value !== undefined) {
      resizeStartState.fieldValues[field] = value
    }
  }
}

/**
 * Resize 拖动中（rAF 节流，与 onDragging 相同的节流策略）。
 *
 * 缩放算法：对角投影法
 *   将鼠标位移向量 (dx, dy) 投影到容器对角线方向（宽度+高度），
 *   计算统一缩放因子：scaleFactor = 1 + (dx + dy) / (startWidth + startHeight)。
 *   所有可缩放字段按同一 scaleFactor 缩放，保持视觉比例一致。
 *
 *   算法依赖 handle 固定位于右下角（CSS: right: 3px; bottom: 3px; cursor: nwse-resize）。
 *   拖拽右下角向东南 → dx > 0, dy > 0 → scaleFactor > 1 → 放大；
 *   拖拽右下角向西北 → dx < 0, dy < 0 → scaleFactor < 1 → 缩小。
 *   如果 handle 位置改变，需要重新设计投影方式。
 *
 * 每次 rAF 回调直接写入 localConfig（与拖拽的 offsetData 缓冲机制不同），
 * 因为 scaleFactor 是相对增量且下一帧计算依赖当前帧的容器尺寸，
 * 延迟批量写入会导致下一帧读到旧的 rect 尺寸，计算偏差累积。
 */
const onResizing = (e: MouseEvent) => {
  const fields = resizeStartState.fields
  if (!fields) return

  const dx = e.clientX - resizeStartState.clientX
  const dy = e.clientY - resizeStartState.clientY
  const { width: startWidth, height: startHeight } = resizeStartState.rect
  const diagonalSum = startWidth + startHeight

  // 对角投影法：将 (dx, dy) 映射为统一缩放因子
  const scaleFactor = diagonalSum > 0 ? 1 + (dx + dy) / diagonalSum : 1

  for (const [field, def] of Object.entries(fields)) {
    const originalValue = resizeStartState.fieldValues[field]
    if (originalValue === undefined) continue

    let newValue = Math.round(originalValue * scaleFactor)
    newValue = Math.max(def.min, Math.min(def.max, newValue))
    // 直接写入 localConfig，Vue 响应性驱动 Widget 重渲染
    writeScalableFieldValue(field, def, newValue)
  }
}

/**
 * Resize 结束：设置 fields = null 作为 sentinel，阻止后续 mousemove 调用 onResizing。
 * 不清除 clientX/clientY/rect/fieldValues —— 它们仅在 fields 非 null 时可访问，无副作用。
 */
const stopResize = () => {
  resizeStartState.fields = null
}

// ──────────────────────────────────────────────────────────────────────────────
// Resize handle DOM 管理
//
// Handle 通过原生 DOM API append 到 widget 容器（xxx__container）内，而非 Vue 模板渲染。
// 原因：容器是子组件（Widget）的根元素，WidgetWrap 无法通过 <slot> 向其根元素注入额外子元素；
// 且 handle 需要在拖拽/缩放手型层面与容器保持一致的 position:absolute 定位锚点。
//
// Vue vdom diff 会把外部 append 的元素当作多余节点移除，因此：
//   - onUpdated 钩子：每次 Widget 重渲染后检查 handle 是否仍连接，否则重建
//   - watch(shouldShowHandle)：选中状态/拖拽模式/可缩放字段变化时同步显隐
//   - toggleResizeHandle(true) 内部有 isConnected 检查，避免在已连接的 handle 上重复 append
// ──────────────────────────────────────────────────────────────────────────────

const shouldShowHandle = computed(
  () =>
    isDragMode.value &&
    (isCurrentActive.value || isHovered.value) &&
    hasScalableFields.value,
)

const resizeHandleEl = ref<HTMLElement | null>(null)

const createHandleElement = (): HTMLElement => {
  const handle = document.createElement('div')
  handle.className = 'widget__resize-handle'
  handle.setAttribute('data-target-code', props.widgetCode)
  handle.setAttribute('data-target-type', 'widget-resize')
  handle.innerHTML =
    `<svg viewBox="0 0 24 24" fill="currentColor" class="resize-handle__icon">` +
    `<circle cx="7" cy="5" r="2.5"/><circle cx="17" cy="5" r="2.5"/>` +
    `<circle cx="7" cy="12" r="2.5"/><circle cx="17" cy="12" r="2.5"/>` +
    `<circle cx="7" cy="19" r="2.5"/><circle cx="17" cy="19" r="2.5"/>` +
    `</svg>`
  return handle
}

/**
 * @param add true 确保 handle 存在（根据 shouldShowHandle 判断），false 强制移除
 */
const toggleResizeHandle = (add: boolean) => {
  if (!add) {
    if (resizeHandleEl.value) {
      resizeHandleEl.value.remove()
      resizeHandleEl.value = null
    }
    return
  }

  if (!shouldShowHandle.value) {
    if (resizeHandleEl.value) {
      resizeHandleEl.value.remove()
      resizeHandleEl.value = null
    }
    return
  }

  // 重新检查 DOM 连接状态：Vue 在 widget 重新渲染时会做 vdom diff，
  // 可能把外部 append 的 handle 当多余子节点移除，此处检测并重建
  if (resizeHandleEl.value && !resizeHandleEl.value.isConnected) {
    resizeHandleEl.value = null
  }

  if (resizeHandleEl.value) return

  const container = getTargetContainerSync()
  if (!container || !container.isConnected) return

  const handle = createHandleElement()
  container.appendChild(handle)
  resizeHandleEl.value = handle
}

// 每次 Vue 更新后确保 handle 存活（widget config 变化触发 re-render 时可能被 diff 掉）
onUpdated(() => {
  toggleResizeHandle(true)
})

// 选中状态或拖拽模式变化时同步 handle 显隐
watch(shouldShowHandle, () => {
  toggleResizeHandle(true)
})

onMounted(() => {
  applyContainerLayout()
  moveState.mouseDownTaskMap.set(props.widgetCode, startDrag)
  moveState.mouseMoveTaskMap.set(props.widgetCode, onDragging)
  moveState.mouseUpTaskMap.set(props.widgetCode, stopDrag)
  moveState.resizeDownTaskMap.set(props.widgetCode, startResize)
  moveState.resizeMoveTaskMap.set(props.widgetCode, onResizing)
  moveState.resizeUpTaskMap.set(props.widgetCode, stopResize)
  nextTick(() => {
    toggleResizeHandle(true)
    toggleInteractListener(true)
  })
})

onUnmounted(() => {
  toggleResizeHandle(false)
  toggleInteractListener(false)
  moveState.mouseDownTaskMap.delete(props.widgetCode)
  moveState.mouseMoveTaskMap.delete(props.widgetCode)
  moveState.mouseUpTaskMap.delete(props.widgetCode)
  moveState.resizeDownTaskMap.delete(props.widgetCode)
  moveState.resizeMoveTaskMap.delete(props.widgetCode)
  moveState.resizeUpTaskMap.delete(props.widgetCode)
})

const isEnabled = computed(() => localConfig[props.widgetCode].enabled)

const isCurrentActive = computed(
  () => props.widgetCode === moveState.currDragTarget.code,
)

const hasScalableFields = computed(
  () => !!SCALABLE_FIELD_REGISTRY[props.widgetCode as WidgetCodes],
)

const isFocusVisible = computed(() => {
  if (!localState.value.isFocusMode) {
    return true
  }
  return !!localConfig.general.focusVisibleWidgetMap[props.widgetCode]
})

// 开启/关闭DragMode时，添加或移除默认样式
watch(isDragMode, (value) => {
  if (!isEnabled.value) {
    return
  }
  if (value) {
    modifyMoveableWrapClass(true, 'widget-auxiliary-line', 'widget-bg-hover')
    if (isHovered.value) {
      modifyMoveableWrapClass(true, 'widget-hover')
    }
  } else {
    modifyMoveableWrapClass(
      false,
      'widget-auxiliary-line',
      'widget-bg-hover',
      'widget-active',
      'widget-delete',
      'widget-dragging',
      'widget-hover',
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
      toggleResizeHandle(false)
      toggleInteractListener(false)
      state.targetContainerEle = null
      // 从交互顺序中移除，避免重建后仍保留旧排序
      const order = localState.value.widgetInteractionOrder
      const idx = order.indexOf(props.widgetCode)
      if (idx !== -1) {
        order.splice(idx, 1)
      }
      return
    }
    // 启用组件，先应用布局样式再加视觉类
    applyContainerLayout()
    nextTick(() => {
      toggleResizeHandle(true)
      toggleInteractListener(true)
      if (isDragMode.value) {
        modifyMoveableWrapClass(
          true,
          'widget-auxiliary-line',
          'widget-bg-hover',
        )
      }
      if (isCurrentActive.value) {
        modifyMoveableWrapClass(true, 'widget-active')
      }
    })
  },
)

// 选中当前组件时添加active样式
watch(isCurrentActive, (value) => {
  modifyMoveableWrapClass(value, 'widget-active')
})

// hover 时添加/移除 widget-hover 类，使 resize handle 可见
watch(isHovered, (value) => {
  if (isDragMode.value && isEnabled.value) {
    modifyMoveableWrapClass(value, 'widget-hover')
  }
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
 * widget__wrap div 的 style 被用于存放定位相关的 CSS 变量，不能再进行 :style 操作
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
/* 定位变量（--nt-x-offset / --nt-y-offset / --nt-x-translate / --nt-y-translate）
   由 :style 通过 CSS 变量注入，子组件继承使用。
   无需在此定义 fallback 值 — widget 始终通过 widgetStyle computed 注入有效值。 */

.widget__wrap--hidden {
  opacity: 0;
  pointer-events: none;
}

.widget__wrap--cursor-move {
  cursor: move !important;
}

/* 拖拽模式下选中 widget 时在右下角显示 resize handle（毛玻璃底托 + mdi:drag 点阵图标） */
.widget__resize-handle {
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 24px;
  height: 24px;
  padding: 3px;
  cursor: nwse-resize;
  opacity: 0;
  border-radius: 7px;
  background: var(--nt-gray-moderate);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: var(--nt-moveable-shadow-resize);
  z-index: 10;
  transition:
    opacity 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
  color: var(--nt-text-color-main);
  box-sizing: border-box;
}

/* 选中active 或 hover 时显示 resize handle */
.widget-active .widget__resize-handle,
.widget-hover .widget__resize-handle {
  opacity: 0.8;
}

.widget__resize-handle:hover {
  opacity: 1 !important;
  background: var(--nt-gray-medium);
  box-shadow: var(--nt-moveable-shadow-resize-hover);
}

.widget-dragging .widget__resize-handle {
  display: none;
}

.resize-handle__icon {
  width: 100%;
  height: 100%;
  display: block;
}

/* 拖动编辑模式 — 辅助线轮廓 */
.widget-auxiliary-line {
  outline: 2px dashed var(--nt-auxiliary-line-widget) !important;
  outline-offset: 2px;
  border-radius: 4px;
}

/* 非激活状态的 hover 高亮 */
.widget-bg-hover:hover {
  background-color: var(--nt-bg-moveable-widget-main) !important;
  box-shadow: var(--nt-moveable-shadow-hover) !important;
  transition: none !important;
}

/* 当前选中（mousedown）激活态 */
.widget-active {
  background-color: var(--nt-bg-moveable-widget-active) !important;
  box-shadow: var(--nt-moveable-shadow-active) !important;
}

/* 拖动进行中 */
.widget-dragging {
  box-shadow: var(--nt-moveable-shadow-drag) !important;
  opacity: 0.92 !important;
  transition:
    box-shadow 150ms ease,
    opacity 150ms ease !important;
}

/* 拖入删除区域 — 红色警示 + 脉冲动画 */
.widget-delete {
  background-color: var(--nt-moveable-tool-delete-btn-color) !important;
  box-shadow: var(--nt-moveable-shadow-delete) !important;
  animation: widget-delete-pulse 1.2s ease-in-out infinite !important;
  transition:
    background-color 200ms ease,
    box-shadow 200ms ease !important;
}

@keyframes widget-delete-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: var(--nt-moveable-shadow-delete) !important;
    opacity: 1 !important;
  }
  50% {
    transform: scale(0.96);
    box-shadow: var(--nt-moveable-shadow-delete-peak) !important;
    opacity: 0.88 !important;
  }
}
</style>
