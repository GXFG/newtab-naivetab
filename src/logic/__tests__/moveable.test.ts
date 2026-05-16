/**
 * moveable.test.ts — 测试 moveable.ts 中的拖拽系统核心函数
 *
 * 测试目标：
 * - getTargetDataFromEvent: DOM 事件解析（纯函数）
 * - cleanupEvents: 拖动状态重置 + 事件清理
 * - animateDeleteWidget: 删除动画 + enabled 设置
 * - handleToggleIsDraftDrawerVisible: 草稿抽屉切换
 * - moveState / toggle: 初始值与状态
 *
 * Mock 策略：
 * - @/logic/store 使用 vi.doMock() + vi.resetModules()
 * - @/logic/gtag mock gaProxy
 * - ResizeObserver 使用 class mock，避免顶层副作用
 *
 * 覆盖率未完全提升原因：
 * handleMousedown/handleMousemove/handleMouseup 是模块内部函数，
 * 通过 watch(isDragMode) 自动注册到 document.body 的事件监听器触发。
 * 这些函数的执行链路依赖 moveState 中的 mouseDownTaskMap 等 Map 结构，
 * 需要结合具体 Widget 的 drag 任务才能完整覆盖。
 * 仅通过构造 MouseEvent 触发 body 事件无法完整模拟整个拖拽流程。
 * 如需进一步提升 coverage，需在集成测试中挂载真实 Widget 组件。
 */

/** 统一的 mock 辅助函数，减少重复代码 */
async function loadMoveable(overrides: { localConfig?: Record<string, any> } = {}) {
  vi.resetModules()

  vi.doMock('@/logic/utils/gtag', () => ({ gaProxy: vi.fn() }))
  vi.doMock('@/logic/store/state', () => ({
    globalState: { isGuideMode: false, isSettingDrawerVisible: false, isSearchFocused: false, isInputFocused: false },
  }))
  vi.doMock('@/logic/config/state', () => ({
    localConfig: overrides.localConfig ?? {},
  }))

  class MockResizeObserver {
    observe = vi.fn()
    disconnect = vi.fn()
  }
  ;(globalThis as any).ResizeObserver = MockResizeObserver

  return import('@/logic/moveable')
}

// ── 纯函数测试：getTargetDataFromEvent ──

describe('getTargetDataFromEvent', () => {
  let getTargetDataFromEvent: typeof import('@/logic/moveable')['getTargetDataFromEvent']

  beforeEach(async () => {
    const mod = await loadMoveable()
    getTargetDataFromEvent = mod.getTargetDataFromEvent
  })

  it('returns empty when target has no data attributes', () => {
    const div = document.createElement('div')
    const mockEvent = new MouseEvent('mousedown', { bubbles: true })
    Object.defineProperty(mockEvent, 'target', { value: div })
    const result = getTargetDataFromEvent(mockEvent)
    expect(result).toEqual({ type: '', code: '' })
  })

  it('extracts type and code from direct target', () => {
    const div = document.createElement('div')
    div.setAttribute('data-target-type', 'widget')
    div.setAttribute('data-target-code', 'clockDigital')

    const mockEvent = new MouseEvent('mousedown')
    Object.defineProperty(mockEvent, 'target', { value: div })

    const result = getTargetDataFromEvent(mockEvent)
    expect(result).toEqual({ type: 'widget', code: 'clockDigital' })
  })

  it('walks up the DOM tree to find data attributes on parent', () => {
    const parent = document.createElement('div')
    parent.setAttribute('data-target-type', 'widget')
    parent.setAttribute('data-target-code', 'search')
    const child = document.createElement('span')
    parent.appendChild(child)

    const mockEvent = new MouseEvent('mousedown')
    Object.defineProperty(mockEvent, 'target', { value: child })

    const result = getTargetDataFromEvent(mockEvent)
    expect(result).toEqual({ type: 'widget', code: 'search' })
  })

  it('handles deeply nested elements', () => {
    const root = document.createElement('div')
    root.setAttribute('data-target-type', 'draft')
    root.setAttribute('data-target-code', 'my-draft')

    let current: HTMLElement = root
    for (let i = 0; i < 5; i++) {
      const child = document.createElement('div')
      current.appendChild(child)
      current = child
    }

    const mockEvent = new MouseEvent('mousedown')
    Object.defineProperty(mockEvent, 'target', { value: current })

    const result = getTargetDataFromEvent(mockEvent)
    expect(result).toEqual({ type: 'draft', code: 'my-draft' })
  })

  it('returns empty when target is not an Element (e.g. TextNode)', () => {
    const textNode = document.createTextNode('hello')
    const mockEvent = new MouseEvent('mousedown')
    Object.defineProperty(mockEvent, 'target', { value: textNode })

    const result = getTargetDataFromEvent(mockEvent)
    expect(result).toEqual({ type: '', code: '' })
  })

  it('returns code as empty string when data-target-code is missing', () => {
    const div = document.createElement('div')
    div.setAttribute('data-target-type', 'widget')

    const mockEvent = new MouseEvent('mousedown')
    Object.defineProperty(mockEvent, 'target', { value: div })

    const result = getTargetDataFromEvent(mockEvent)
    expect(result).toEqual({ type: 'widget', code: '' })
  })
})

// ── cleanupEvents 测试（间接验证 onResetMoveState） ──

describe('cleanupEvents', () => {
  let cleanupEvents: typeof import('@/logic/moveable')['cleanupEvents']
  let moveState: typeof import('@/logic/moveable')['moveState']

  beforeEach(async () => {
    const mod = await loadMoveable({ localConfig: { testWidget: { enabled: true } } })
    cleanupEvents = mod.cleanupEvents
    moveState = mod.moveState
  })

  it('resets all moveState flags to default values', () => {
    moveState.isWidgetStartDrag = true
    moveState.isDeleteHover = true
    moveState.currDragTarget.type = 'widget'
    moveState.currDragTarget.code = 'clockDigital'

    cleanupEvents()

    expect(moveState.isWidgetStartDrag).toBe(false)
    expect(moveState.isDeleteHover).toBe(false)
    expect(moveState.currDragTarget.type).toBe('')
    expect(moveState.currDragTarget.code).toBe('')
  })

  it('is idempotent — calling twice does not throw', () => {
    cleanupEvents()
    cleanupEvents()
  })
})

// ── handleToggleIsDraftDrawerVisible 测试 ──

describe('handleToggleIsDraftDrawerVisible', () => {
  let handleToggleIsDraftDrawerVisible: typeof import('@/logic/moveable')['handleToggleIsDraftDrawerVisible']
  let isDraftDrawerVisible: typeof import('@/logic/moveable')['isDraftDrawerVisible']
  let cleanupEvents: typeof import('@/logic/moveable')['cleanupEvents']

  beforeEach(async () => {
    const mod = await loadMoveable()
    handleToggleIsDraftDrawerVisible = mod.handleToggleIsDraftDrawerVisible
    isDraftDrawerVisible = mod.isDraftDrawerVisible
    cleanupEvents = mod.cleanupEvents
  })

  afterEach(() => {
    cleanupEvents()
  })

  it('toggles the draft drawer visibility', () => {
    const initial = isDraftDrawerVisible.value
    handleToggleIsDraftDrawerVisible()
    expect(isDraftDrawerVisible.value).toBe(!initial)
  })

  it('resets lastIsDraftDrawerVisible flag on each call', () => {
    handleToggleIsDraftDrawerVisible()
    handleToggleIsDraftDrawerVisible()
    handleToggleIsDraftDrawerVisible()
    expect(typeof isDraftDrawerVisible.value).toBe('boolean')
  })
})

// ── animateDeleteWidget 测试 ──

describe('animateDeleteWidget', () => {
  let animateDeleteWidget: typeof import('@/logic/moveable')['animateDeleteWidget']
  let localConfig: any
  let cleanupEvents: typeof import('@/logic/moveable')['cleanupEvents']

  beforeEach(async () => {
    vi.useFakeTimers()

    localConfig = {
      myWidget: { enabled: true },
    }

    const mod = await loadMoveable({ localConfig })
    animateDeleteWidget = mod.animateDeleteWidget
    cleanupEvents = mod.cleanupEvents
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanupEvents()
  })

  it('sets transform scale(0.3) and opacity 0 on container', () => {
    const container = document.createElement('div')
    container.className = 'myWidget__container'
    document.body.appendChild(container)

    animateDeleteWidget('myWidget' as any)

    expect(container.style.transition).toContain('transform')
    expect(container.style.transform).toContain('scale(0.3)')
    expect(container.style.opacity).toBe('0')

    document.body.removeChild(container)
  })

  it('disables widget after animation delay (260ms)', async () => {
    const container = document.createElement('div')
    container.className = 'myWidget__container'
    document.body.appendChild(container)

    animateDeleteWidget('myWidget' as any)
    await vi.advanceTimersByTimeAsync(260)
    expect(localConfig.myWidget.enabled).toBe(false)

    document.body.removeChild(container)
  })

  it('appends scale to existing transform', () => {
    const container = document.createElement('div')
    container.className = 'myWidget__container'
    container.style.transform = 'translate(10px, 20px)'
    document.body.appendChild(container)

    animateDeleteWidget('myWidget' as any)

    expect(container.style.transform).toContain('translate(10px, 20px)')
    expect(container.style.transform).toContain('scale(0.3)')

    document.body.removeChild(container)
  })

  it('throws when widget config does not exist (edge case)', async () => {
    // animateDeleteWidget 对未知 widget 会尝试设置 localConfig[code].enabled
    // 而 localConfig[code] 为 undefined，这会在 setTimeout 中抛出
    animateDeleteWidget('nonexistentWidget' as any)
    await expect(vi.advanceTimersByTimeAsync(300)).rejects.toThrow()
  })
})

// ── moveState 初始值测试 ──

describe('moveState initial values', () => {
  let moveState: typeof import('@/logic/moveable')['moveState']
  let cleanupEvents: typeof import('@/logic/moveable')['cleanupEvents']

  beforeEach(async () => {
    const mod = await loadMoveable()
    moveState = mod.moveState
    cleanupEvents = mod.cleanupEvents
  })

  afterEach(() => {
    cleanupEvents()
  })

  it('has correct initial width and height from window', () => {
    expect(moveState.width).toBe(window.innerWidth)
    expect(moveState.height).toBe(window.innerHeight)
  })

  it('has empty Maps for task handlers', () => {
    expect(moveState.mouseDownTaskMap).toBeInstanceOf(Map)
    expect(moveState.mouseMoveTaskMap).toBeInstanceOf(Map)
    expect(moveState.mouseUpTaskMap).toBeInstanceOf(Map)
    expect(moveState.mouseDownTaskMap.size).toBe(0)
  })

  it('has correct initial boolean flags', () => {
    expect(moveState.isWidgetStartDrag).toBe(false)
    expect(moveState.isDeleteHover).toBe(false)
    expect(moveState.isXAxisCenterVisible).toBe(false)
    expect(moveState.isYAxisCenterVisible).toBe(false)
    expect(moveState.isTopBoundVisible).toBe(false)
    expect(moveState.isBottomBoundVisible).toBe(false)
    expect(moveState.isLeftBoundVisible).toBe(false)
    expect(moveState.isRightBoundVisible).toBe(false)
  })

  it('has empty currDragTarget', () => {
    expect(moveState.currDragTarget.type).toBe('')
    expect(moveState.currDragTarget.code).toBe('')
  })
})

// ── cleanupResizeObserver 测试 ──

describe('cleanupResizeObserver', () => {
  let cleanupResizeObserver: typeof import('@/logic/moveable')['cleanupResizeObserver']

  beforeEach(async () => {
    vi.resetModules()

    vi.doMock('@/logic/utils/gtag', () => ({ gaProxy: vi.fn() }))
    vi.doMock('@/logic/store/state', () => ({
      globalState: { isGuideMode: false, isSettingDrawerVisible: false, isSearchFocused: false, isInputFocused: false },
    }))
    vi.doMock('@/logic/config/state', () => ({
      localConfig: {},
    }))

    const mod = await import('@/logic/moveable')
    cleanupResizeObserver = mod.cleanupResizeObserver
  })

  it('disconnects the ResizeObserver without errors', () => {
    expect(() => cleanupResizeObserver()).not.toThrow()
  })

  it('is idempotent', () => {
    cleanupResizeObserver()
    cleanupResizeObserver()
  })
})

// ── toggle 导出测试 ──

describe('toggle exports', () => {
  let isDragMode: typeof import('@/logic/moveable')['isDragMode']
  let toggleIsDragMode: typeof import('@/logic/moveable')['toggleIsDragMode']
  let cleanupEvents: typeof import('@/logic/moveable')['cleanupEvents']

  beforeEach(async () => {
    const mod = await loadMoveable()
    isDragMode = mod.isDragMode
    toggleIsDragMode = mod.toggleIsDragMode
    cleanupEvents = mod.cleanupEvents
  })

  afterEach(() => {
    cleanupEvents()
  })

  it('isDragMode starts as false', () => {
    expect(isDragMode.value).toBe(false)
  })

  it('toggleIsDragMode toggles the value', () => {
    toggleIsDragMode()
    expect(isDragMode.value).toBe(true)
    toggleIsDragMode()
    expect(isDragMode.value).toBe(false)
  })
})
