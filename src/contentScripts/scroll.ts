/**
 * Content Script 滚动容器查找与平滑滚动工具
 *
 * 从 contentScripts/index.ts 提取，供 CS 端命令执行器使用。
 *
 * 架构（参考 Vimium C scroller.ts）：
 * - 交互追踪：trackInteraction 仅记录原始 target 元素，不做试滚验证，
 *   避免干扰 scroll-snap / 自定义滚动容器页面（如 km.sankuai.com）。
 * - 滚动容器查找：四级策略（lastInteractedTarget → elementFromPoint +
 *   findScrollableAncestor → selectFirstScrollable 面积评分 → scrollingElement）。
 * - doesScroll 验证：仅在 getValidatedScrollContainer 或 findScrollableAncestor
 *   中调用，确保容器真正可滚动，失败时清除缓存重新查找。
 * - 缓存机制：cachedScrollContainer / cachedHorizontalScrollContainer 提升
 *   连续调用性能，通过 invalidateScrollCache（scrollend / MutationObserver）失效。
 */

/**
 * 获取页面缩放因子。
 * 在 125%/150% 缩放的 Windows 设备上，1 CSS px 可能不对应整数物理像素，
 * doesScroll 的 1px 试滚可能因舍入而失败。使用缩放因子确保试滚量足够。
 *
 * 注意：仅读取 document.documentElement 的 inline style.zoom，不读 getComputedStyle。
 * 绝大多数场景无需 zoom 补偿（devicePixelRatio 已覆盖系统缩放），仅少数页面
 * 显式设置 `<html style="zoom:125%">` 时才需要。读 inline style 足够覆盖此场景，
 * 读 getComputedStyle 会引入不必要的样式重计算。
 */
const getZoomFactor = (): number => {
  const zoom = (document.documentElement as HTMLElement)?.style?.zoom
  const cssZoom = zoom ? parseFloat(zoom) / 100 : 1
  return Math.max(1, window.devicePixelRatio / cssZoom)
}

/**
 * 验证元素是否真的可以在指定轴向上滚动。
 * 参考 Vimium C 的 doesScroll 机制：实际尝试滚动 1px，
 * 检查 scrollLeft/scrollTop 是否变化，然后还原。
 * 比单纯检查 overflow + scrollWidth/Height 更可靠。
 *
 * scroll-snap 容器预判：通过 getComputedStyle 检测 scroll-snap-type，
 * 避免直接赋值 scrollTop/scrollLeft 在 snap 容器中行为不一致的问题。
 *
 * 注意：当 amount 为 1 时（容器有效性检查），会正反两个方向各试 1px，
 * 避免容器已在底部/右侧时正向测试失败导致误判（参考 Vimium C shouldScroll_s）。
 *
 * ⚠️ 此函数会实际修改滚动位置（尽管会还原），因此仅在确定需要验证时调用，
 *   不在用户交互追踪（trackInteraction）中使用，以免干扰宿主页面。
 */
const doesScroll = (
  el: Element,
  axis: 'vertical' | 'horizontal',
  amount = 1,
): boolean => {
  const prop = axis === 'horizontal' ? 'scrollLeft' : 'scrollTop'
  // 检测 scroll-snap 容器（参考 Vimium C hasSpecialScrollSnap）
  const hasSnap = (() => {
    const snapType = getComputedStyle(el).scrollSnapType
    return snapType && snapType !== 'none'
  })()

  // 缩放因子：高 DPI / 缩放设备下确保试滚量足够（Vimium C getPixelScaleToScroll）
  const zoomFactor = getZoomFactor()
  const calibratedAmount = Math.max(1, Math.ceil(amount * zoomFactor))

  const tryScroll = (dx: number, dy: number): boolean => {
    const before = el[prop]
    el.scrollBy({ left: dx, top: dy, behavior: 'instant' })
    const changed = el[prop] !== before
    if (changed) {
      el.scrollTo({
        left: axis === 'horizontal' ? before : el.scrollLeft,
        top: axis === 'horizontal' ? el.scrollTop : before,
        behavior: 'instant',
      })
      if (el[prop] !== before && hasSnap) {
        el.scrollTo({
          left: axis === 'horizontal' ? before : el.scrollLeft,
          top: axis === 'horizontal' ? el.scrollTop : before,
          behavior: 'instant',
        })
      }
    }
    return changed
  }

  // 容器有效性检查（amount === 1）：正反向各试一次
  // 解决容器已在底部时正向测试失败导致 lastInteracted 被误清除的问题
  if (amount === 1) {
    const dx = axis === 'horizontal' ? calibratedAmount : 0
    const dy = axis === 'horizontal' ? 0 : calibratedAmount
    return tryScroll(dx, dy) || tryScroll(-dx, -dy)
  }

  // 实际滚动量测试
  const dx = axis === 'horizontal' ? calibratedAmount : 0
  const dy = axis === 'horizontal' ? 0 : calibratedAmount
  return tryScroll(dx, dy)
}

/**
 * 查找页面上真正的纵向滚动容器。
 * 优先级（参考 Vimium C findScrollable）：
 * 1. lastInteractedTargetEl：从最近交互过的原始元素向上查找可滚动祖先
 * 2. elementFromPoint(viewport中心) → findScrollableAncestor（祖先链查找）
 * 3. selectFirstScrollable：子元素面积评分（SPA 复杂布局兜底）
 * 4. document.scrollingElement（最终兜底）
 */
const findScrollContainer = (): Element => {
  // 优先：从最近交互过的元素向上查找纵向滚动容器
  const target = lastInteractedTargetEl?.deref()
  if (target && document.body.contains(target)) {
    const vEl = findScrollableAncestor(target, 'vertical')
    if (vEl) return vEl
  }

  // 全屏元素边界：全屏模式下限制在全屏元素范围内
  const fullscreenEl = document.fullscreenElement
  const searchRoot =
    fullscreenEl && document.body.contains(fullscreenEl) ? fullscreenEl : null

  // fallback：viewport 中心元素 → 祖先链（参考 Vimium C scroller.ts:602-608）
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const pointEl = document.elementFromPoint(centerX, centerY)
  const fallback = findScrollableAncestor(pointEl, 'vertical')
  if (fallback) return fallback

  // 子元素面积评分：当中心点路径找不到可滚动容器时（常见于 SPA），
  // 查找可见面积最大的子元素内部的可滚动容器
  const scored = selectFirstScrollable(searchRoot ?? document.documentElement)
  if (scored) return scored

  // 最终兜底
  return document.scrollingElement ?? document.documentElement
}

/**
 * 子元素面积评分查找。
 * 参考 Vimium C selectFirst：当 elementFromPoint 路径找不到可滚动容器时，
 * 对 documentElement.children 进行可见面积评分，递归查找最大可见子元素内部的可滚动容器。
 * 适用于 SPA 复杂布局（Notion、飞书等）中心点落在 sidebar/overlay 的场景。
 */
const selectFirstScrollable = (root: Element): Element | null => {
  const children = root.children
  if (!children || children.length > 50) return null
  // 子元素 > 50 时放弃面积评分：body 直接子元素过多的页面（大量 Portal
  // 挂载点等）通常是复杂 SPA，面积评分不可靠。此时依赖 elementFromPoint 路径，
  // 最终兜底到 document.scrollingElement。

  const scored: { area: number; el: Element }[] = []
  for (let i = 0; i < children.length; i++) {
    const el = children[i]
    const rect = el.getBoundingClientRect()
    if (rect.width > 199 && rect.height > 199) {
      scored.push({ area: rect.width * rect.height, el })
    }
  }
  scored.sort((a, b) => b.area - a.area)

  for (const { el } of scored) {
    const found = findScrollableAncestor(el, 'vertical')
    if (found) return found
    // 递归深入子元素
    const nested = selectFirstScrollable(el)
    if (nested) return nested
  }
  return null
}

/** 缓存上次找到的滚动容器，提升后续调用性能 */
let cachedScrollContainer: Element | null = null
let cachedHorizontalScrollContainer: Element | null = null

/**
 * 用户最近交互过的原始目标元素（WeakRef 避免内存泄漏）。
 * 不再预先调用 findScrollableAncestor + doesScroll 试滚验证，
 * 延迟到 findScrollContainer / findHorizontalScrollContainer 真正需要时才解析。
 * 这避免了在 scroll-snap / 自定义滚动容器页面上，交互时就被试滚干扰。
 */
let lastInteractedTargetEl: WeakRef<Element> | null = null

/**
 * 判断元素是否可滚动（三态返回值）。
 * 参考 Vimium C shouldScroll_s 机制：
 * -1 = 明确不可滚动（display: none / visibility: hidden / overflow: hidden|clip / position: fixed|sticky）
 *  0 = 不确定（overflow: visible 等，需要 doesScroll 实际验证）
 *  1 = 明确可滚动（auto|scroll|overlay 且有滚动空间）
 */
const shouldScroll = (
  el: Element,
  axis: 'horizontal' | 'vertical',
): -1 | 0 | 1 => {
  const style = getComputedStyle(el)
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse'
  ) {
    return -1
  }
  const prop = axis === 'horizontal' ? 'overflowX' : 'overflowY'
  const overflow = style[prop]
  if (overflow === 'hidden' || overflow === 'clip') {
    return -1
  }
  // position: fixed / sticky 的元素通常是浮动面板或导航栏，
  // 即使有 overflow 也不应作为主滚动容器（Vimium C scrollIntoView_s 中的排除逻辑）
  if (style.position === 'fixed' || style.position === 'sticky') {
    return -1
  }
  // overflow: auto|scroll|overlay 时检查实际滚动空间
  if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
    const scrollProp = axis === 'horizontal' ? 'scrollWidth' : 'scrollHeight'
    const clientProp = axis === 'horizontal' ? 'clientWidth' : 'clientHeight'
    if (el[scrollProp] > el[clientProp] + 1) {
      return 1
    }
  }
  // overflow: visible 或 auto 但尺寸尚未溢出 → 不确定，需 doesScroll 验证
  return 0
}

/**
 * 检查元素本身或其祖先是否为可滚动的容器。
 * 返回最近的符合条件的祖先（或自身）。
 * 使用 shouldScroll 三态判断，支持 overflow: visible 但有实际滚动空间的元素。
 * 跳过 position: fixed/sticky 元素（通常是浮动导航栏）。
 */
const findScrollableAncestor = (
  start: Element | null,
  axis: 'horizontal' | 'vertical',
): Element | null => {
  let cur: Element | null = start
  while (cur) {
    const result = shouldScroll(cur, axis)
    if (result === -1) {
      cur = cur.parentElement
      continue
    }
    // result === 1：明确可滚动（overflow + scrollSpace 已确认），直接返回
    // result === 0：不确定（overflow: visible 等），用 doesScroll 实际验证
    if (result === 1 || doesScroll(cur, axis)) {
      return cur
    }
    cur = cur.parentElement
  }
  return null
}

/**
 * 记录用户交互过的原始目标元素（click / mousedown / focusin / wheel 事件触发）。
 * 仅记录 target，不立即做滚动能力验证，避免干扰宿主页面。
 */
const trackInteraction = (target: Element) => {
  lastInteractedTargetEl = new WeakRef(target)
}

/**
 * 获取当前滚动容器（优先返回缓存，失效时重新查找）
 */
export const getScrollContainer = (): Element => {
  return (
    cachedScrollContainer ?? (cachedScrollContainer = findScrollContainer())
  )
}

/**
 * 查找页面上有水平滚动空间的容器。
 * 策略（参考 Vimium C findScrollable）：
 * 1. 从最近交互过的原始 target 向上查找可滚动祖先
 * 2. viewport 中心的 elementFromPoint → 祖先链查找（首次/无交互时兜底）
 * 3. document.scrollingElement（最终兜底）
 */
const findHorizontalScrollContainer = (): Element => {
  // 优先：从最近交互过的元素向上查找横向滚动容器
  const target = lastInteractedTargetEl?.deref()
  if (target && document.body.contains(target)) {
    const hEl = findScrollableAncestor(target, 'horizontal')
    if (hEl) return hEl
  }

  // fallback：viewport 中心元素 → 祖先链
  const fallback = findScrollableAncestor(
    document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2),
    'horizontal',
  )
  if (fallback) return fallback

  // 最终兜底
  return document.scrollingElement ?? document.documentElement
}

/**
 * 获取当前水平滚动容器（优先返回缓存，失效时重新查找）
 */
export const getHorizontalScrollContainer = (): Element => {
  return (
    cachedHorizontalScrollContainer ??
    (cachedHorizontalScrollContainer = findHorizontalScrollContainer())
  )
}

/**
 * 使滚动容器缓存失效（在 DOM 结构变化或用户手动滚动后调用）
 * 同时清除交互追踪记录，避免 DOM 变化后仍指向旧元素。
 */
export const invalidateScrollCache = () => {
  cachedScrollContainer = null
  cachedHorizontalScrollContainer = null
  lastInteractedTargetEl = null
}

// -- 模块级副作用（有意为之） --
// 以下监听器在 Content Script 注入时立即注册，不依赖 index.ts 的 initMain。
// 原因：滚动容器缓存失效是独立于快捷键系统的纯工具逻辑，页面导航/关闭时
// 整个 JS 环境自动销毁，监听器自动回收，无需手动清理。
//
// 追踪用户交互过的原始 target 元素（click/mousedown/focusin/wheel），
// 延迟到滚动命令执行时才从 target 向上查找可滚动容器，避免试滚干扰宿主页面。
// 覆盖 4 种事件：
// - click：点击元素
// - mousedown：鼠标按下（覆盖不触发 click 的可滚动区域）
// - focusin：聚焦 input/textarea 等
// - wheel：滚轮滚动（最精准地捕获用户正在滚的容器）
const INTERACTION_EVENTS = ['click', 'mousedown', 'focusin', 'wheel'] as const
for (const type of INTERACTION_EVENTS) {
  document.addEventListener(
    type,
    (e) => {
      const target = e.target
      if (target instanceof Element) {
        trackInteraction(target)
      }
    },
    { capture: true, passive: true },
  )
}

// 滚动结束后自动失效缓存 + 更新交互记录，下次滚动时重新查找容器。
//
// 注意：每次滚动都会触发 scrollend（包括 doesScroll 的 1px 试滚），意味着
// 缓存跨调度周期必然失效，下一次滚动命令总是重查容器。这是有意为之：SSR/CSR
// 混合页面和动态内容可能导致缓存的容器过时，宁可重查（耗时 <1ms）也不冒险。
//
// 缓存价值体现在同步调用链内：findScrollableAncestor 遍历祖先时，doesScroll
// 对同一元素只试滚一次（scrollend 异步触发，不干扰当前同步栈）。
// 连续滚动的 rAF 循环使用独立变量 continuousScrollEl，不依赖缓存。
//
// scrollend 事件：Chrome 77+ / Firefox 115+ / Safari 16+
document.addEventListener(
  'scrollend',
  (e) => {
    // 记录用户实际滚动的元素（下次快捷键滚动时从其祖先链查找），
    // 同时清除缓存，确保容器不过时。
    const target = e.target
    if (target instanceof Element) {
      trackInteraction(target)
    }
    invalidateScrollCache()
  },
  { capture: true, passive: true },
)

// 监听 DOM 变化：当页面结构变化（SPA 导航、动态加载）时使缓存失效。
//
// subtree: false 意味着仅监听 body 的直接子元素的增减和 class/style 变化，
// 深层 DOM 变化（如 #app 内部的 SPA 路由切换）不会触发。这是性能/覆盖面的权衡：
// - 全树监听（subtree: true）会捕获每个 DOM 变动，在大型 SPA 中开销显著
// - 深层 SPA 导航通常伴随滚动（scrollend 触发失效），scrollend 补位了大部分场景
// - body 的直接子元素变化（React Portal 挂载/卸载根节点）能被捕获
const scrollCacheObserver = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (
      m.type === 'childList' ||
      m.attributeName === 'class' ||
      m.attributeName === 'style'
    ) {
      invalidateScrollCache()
      break
    }
  }
})
if (document.body) {
  scrollCacheObserver.observe(document.body, {
    childList: true,
    subtree: false,
    attributes: true,
    attributeFilter: ['class', 'style'],
  })
}
document.addEventListener(
  'DOMContentLoaded',
  () => {
    if (document.body) {
      scrollCacheObserver.observe(document.body, {
        childList: true,
        subtree: false,
        attributes: true,
        attributeFilter: ['class', 'style'],
      })
    }
  },
  { once: true },
)

/**
 * 滚动步长：SCROLL_STEP_RATIO * 视口高度/宽度
 */
export const SCROLL_STEP_RATIO = 0.05

/**
 * 逐屏滚动命令元数据。
 * 集中定义方向、步长和轴向，避免在多处硬编码字符串比较。
 * axis: 'vertical' | 'horizontal'
 */
export const SCROLL_SCREEN_META: ReadonlyMap<
  string,
  { stepRatio: number; axis: 'vertical' | 'horizontal' }
> = new Map([
  ['scrollUp', { stepRatio: -SCROLL_STEP_RATIO, axis: 'vertical' }],
  ['scrollDown', { stepRatio: SCROLL_STEP_RATIO, axis: 'vertical' }],
  ['scrollLeft', { stepRatio: -SCROLL_STEP_RATIO, axis: 'horizontal' }],
  ['scrollRight', { stepRatio: SCROLL_STEP_RATIO, axis: 'horizontal' }],
])

/**
 * 快速平滑滚动辅助函数（基于时间的 ease-out）。
 * 持续时间根据滚动量对数缩放（参考 Vimium C：duration ∝ ln(amount)），
 * 小距离滚动快速完成，大距离滚动适当延长但边际递减。
 * 智能查找实际滚动容器，兼容 SPA / 内部滚动容器的页面。
 *
 * @param el 可选，已知滚动容器。避免内外两次查找拿到不同元素。
 */
export const fastSmoothScrollTo = (targetY: number, el?: Element) => {
  const container = el ?? getValidatedScrollContainer('vertical')
  const startY = container.scrollTop
  const maxScroll = container.scrollHeight - container.clientHeight
  const clampedTarget = Math.max(0, Math.min(targetY, maxScroll))
  const delta = clampedTarget - startY
  if (delta === 0) return
  const duration = Math.max(120, Math.min(500, 30 * Math.log(Math.abs(delta))))
  const startTime = performance.now()
  const step = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - (1 - progress) ** 3
    container.scrollTop = startY + delta * ease
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/**
 * 水平方向平滑滚动到指定 X 坐标。
 * 与 fastSmoothScrollTo 逻辑一致，但使用专用的水平容器查找。
 *
 * @param el 可选，已知水平滚动容器。避免内外两次查找拿到不同元素。
 */
export const fastSmoothScrollToX = (targetX: number, el?: Element) => {
  const container = el ?? getHorizontalScrollContainer()
  const startX = container.scrollLeft
  const maxScroll = container.scrollWidth - container.clientWidth
  const clampedTarget = Math.max(0, Math.min(targetX, maxScroll))
  const delta = clampedTarget - startX
  if (delta === 0) return
  const duration = Math.max(120, Math.min(500, 30 * Math.log(Math.abs(delta))))
  const startTime = performance.now()
  const step = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - (1 - progress) ** 3
    container.scrollLeft = startX + delta * ease
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/**
 * 持续滚动动画循环
 *
 * 核心思路：按住 scroll key 时启动 rAF 循环，
 * 速度由按住时长平滑驱动（speed = 初始 + ramp × 按住秒数），
 * 不依赖 OS 按键重复（e.repeat 仅触发 startContinuousScroll 的轻量维持），
 * 松开后减速停止，全程平滑无卡顿。
 *
 * | 事件        | 行为                               |
 * | ----------- | ---------------------------------- |
 * | keydown     | 启动/继续循环，重置按住时间         |
 * | repeat      | 仅更新 continuousScrollKey（空操作） |
 * | keyup       | 减速后自然停止                     |
 *
 * 参考 Vimium C scroller.ts 的动画系统：
 * - 速度基于 px/second 而非 px/frame，确保 60Hz/120Hz/144Hz 屏幕表现一致
 * - 平滑加速：速度 = INITIAL_SCROLL_SPEED + SPEED_RAMP × holdTime，
 *   约 1.3 秒从初始爬升到 MAX_SCROLL_SPEED，跨平台一致
 * - smooth scroll 持续时间使用对数缩放（滚动量越大时间越长，但边际递减）
 *   duration = 30 * ln(amount)，与 Vimium C 的 20 * ln(amount) 逻辑一致
 */

// -- 持续滚动状态 --
let continuousScrollKey: string | null = null
let continuousScrollDirection: number = 0 // 1=down/right, -1=up/left
let continuousScrollSpeed = 0 // px/second，基于时间而非帧
let continuousScrollLoop: number | null = null // rAF id，null 表示循环未运行
let continuousScrollEl: Element | null = null
let continuousScrollAxis: 'vertical' | 'horizontal' = 'vertical'

/** rAF 帧的上一帧时间戳 */
let continuousScrollLastTime = 0
/** 本次按住 scroll key 的起始时间（performance.now），用于平滑加速 */
let continuousScrollStartTime = 0

/** 初始速度：~200px/s，60Hz 下约 3.3px/frame，起步有存在感 */
const INITIAL_SCROLL_SPEED = 200
/**
 * 速度爬升率：按住期间每秒增加 320 px/s，约 1.25 秒从 200 平滑加速到 600。
 * 公式：speed(t) = INITIAL_SCROLL_SPEED + SPEED_RAMP × t（t 为按住秒数）
 * 跨平台一致：不依赖 OS key repeat 间隔，仅与按住时长有关。
 */
const SPEED_RAMP = 320
/** 最大速度：~600px/s，足够快但不眩晕 */
const MAX_SCROLL_SPEED = 600 // px/s
/**
 * 减速度系数：松开后每帧乘以 0.4，约 5 帧（~80ms @60Hz）速度降至 10 px/s 以下停止。
 *
 * 数值来源：MAX(600) × 0.4^5 ≈ 6.1 < 10，5 帧缓冲滑行约 6.5px，既非松手即钉，
 * 也非惯性过大。低速释放时帧数更少（200 起步约 3 帧），符合直觉。
 */
const DECEL_RATE = 0.4

/**
 * 获取经 doesScroll 验证的滚动容器。
 * 参考 Vimium C findScrollable + doesScroll 机制：
 * 缓存容器可能已过时（DOM 变化 / 滚动到底部），通过 doesScroll 试滚验证，
 * 失败时清除缓存重新查找。
 *
 * @param axis 'vertical' | 'horizontal'
 */
export const getValidatedScrollContainer = (
  axis: 'vertical' | 'horizontal',
): Element => {
  let el =
    axis === 'horizontal'
      ? getHorizontalScrollContainer()
      : getScrollContainer()
  if (!doesScroll(el, axis)) {
    invalidateScrollCache()
    el =
      axis === 'horizontal'
        ? getHorizontalScrollContainer()
        : getScrollContainer()
  }
  return el
}

/**
 * 启动/继续持续滚动动画。
 * command: 'scrollUp' | 'scrollDown' | 'scrollLeft' | 'scrollRight'
 *
 * 时间驱动平滑加速：speed(t) = INITIAL + RAMP × 按住秒数。
 * 首次按下和方向/轴切换时重置起始时间；OS key repeat 时仅维持状态（空操作），
 * 加速由 rAF 循环内部按性能时间自动计算。
 */
export const startContinuousScroll = (command: string) => {
  const meta = SCROLL_SCREEN_META.get(command)
  if (!meta) return
  const direction = meta.stepRatio > 0 ? 1 : -1

  // 首次按下或方向/轴切换：重置计时
  if (continuousScrollKey !== command || !continuousScrollLoop) {
    continuousScrollStartTime = performance.now()
    continuousScrollLastTime = 0
  }
  // 同一命令的 repeat 调用不做任何事，速度由 continuousScrollFrame 控制

  continuousScrollKey = command
  continuousScrollDirection = direction
  continuousScrollAxis = meta.axis
  continuousScrollEl = getValidatedScrollContainer(meta.axis)

  if (!continuousScrollLoop) {
    continuousScrollLastTime = 0
    continuousScrollLoop = requestAnimationFrame(continuousScrollFrame)
  }
}

/**
 * 停止持续滚动。
 * keyup 时调用，会减速后自然停止。
 */
export const stopContinuousScroll = () => {
  continuousScrollKey = null
}

/** rAF 帧回调 */
const continuousScrollFrame = (now: number) => {
  if (!continuousScrollEl) return
  continuousScrollLoop = null

  // 计算实际帧间隔（秒），确保 60Hz/120Hz/144Hz 表现一致
  let dt = 1 / 60 // 默认 60fps 间隔
  if (continuousScrollLastTime) {
    dt = (now - continuousScrollLastTime) / 1000
    // 异常帧间隔（>100ms，如后台标签页），钳位到 0.05s 避免跳变
    if (dt > 0.1) dt = 0.05
  }
  continuousScrollLastTime = now

  if (continuousScrollKey) {
    // 按住中：按性能时间平滑加速
    const holdTime = (now - continuousScrollStartTime) / 1000
    continuousScrollSpeed = Math.min(
      INITIAL_SCROLL_SPEED + SPEED_RAMP * holdTime,
      MAX_SCROLL_SPEED,
    )
  } else {
    // 松开后减速
    continuousScrollSpeed *= DECEL_RATE
    if (continuousScrollSpeed < 10) {
      continuousScrollDirection = 0
      continuousScrollSpeed = 0
      return
    }
  }

  const delta = continuousScrollSpeed * dt * continuousScrollDirection
  if (continuousScrollAxis === 'horizontal') {
    continuousScrollEl.scrollLeft += delta
  } else {
    continuousScrollEl.scrollTop += delta
  }
  continuousScrollLoop = requestAnimationFrame(continuousScrollFrame)
}
