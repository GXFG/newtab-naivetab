import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * task.test.ts — 测试 task.ts 中的四套任务注册系统
 *
 * Mock 策略：
 * - @/logic/store 的 globalState 和 switchSettingDrawerVisible 必须在 import task 前 mock
 * - 使用 vi.useFakeTimers() 控制 timer
 */

describe('keydown task system', () => {
  let addKeydownTask: (typeof import('@/logic/task'))['addKeydownTask']
  let removeKeydownTask: (typeof import('@/logic/task'))['removeKeydownTask']
  let startKeydown: (typeof import('@/logic/task'))['startKeydown']
  let stopKeydown: (typeof import('@/logic/task'))['stopKeydown']

  beforeEach(async () => {
    // Reset module-level state between test files
    vi.resetModules()

    // Mock store BEFORE importing task
    vi.doMock('@/logic/store/state', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: false,
        isSearchFocused: false,
        isInputFocused: false,
        drawerStack: [],
      },
      switchSettingDrawerVisible: vi.fn(),
      closeSettingDrawer: vi.fn(),
      closeTopDrawer: vi.fn(),
    }))

    const task = await import('@/logic/task')
    addKeydownTask = task.addKeydownTask
    removeKeydownTask = task.removeKeydownTask
    startKeydown = task.startKeydown
    stopKeydown = task.stopKeydown

    // Clean up
    stopKeydown()
  })

  it('registers and removes keydown tasks', () => {
    const fn = vi.fn()
    addKeydownTask('test-task' as any, fn)
    // Task is registered (no error thrown)
    removeKeydownTask('test-task' as any)
    // Task is removed (no error thrown)
  })

  it('calls registered tasks when key is pressed', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    addKeydownTask('task1' as any, fn1)
    addKeydownTask('task2' as any, fn2)
    startKeydown()

    const event = new KeyboardEvent('keydown', { code: 'KeyA' })
    document.onkeydown!(event)

    expect(fn1).toHaveBeenCalledWith(event)
    expect(fn2).toHaveBeenCalledWith(event)

    removeKeydownTask('task1' as any)
    removeKeydownTask('task2' as any)
    stopKeydown()
  })

  it('stops further tasks when a task returns true', () => {
    const fn1 = vi.fn().mockReturnValue(true)
    const fn2 = vi.fn()
    addKeydownTask('task1' as any, fn1)
    addKeydownTask('task2' as any, fn2)
    startKeydown()

    const event = new KeyboardEvent('keydown', { code: 'KeyA' })
    document.onkeydown!(event)

    expect(fn1).toHaveBeenCalled()
    expect(fn2).not.toHaveBeenCalled()

    removeKeydownTask('task1' as any)
    removeKeydownTask('task2' as any)
    stopKeydown()
  })

  it('ignores keys when guide mode is active (except Escape)', async () => {
    vi.resetModules()
    vi.doMock('@/logic/store/state', () => ({
      globalState: {
        isGuideMode: true,
        isSettingDrawerVisible: false,
        isSearchFocused: false,
        isInputFocused: false,
        drawerStack: [],
      },
      switchSettingDrawerVisible: vi.fn(),
    }))

    vi.useFakeTimers()

    const task = await import('@/logic/task')
    const fn = vi.fn()
    task.addKeydownTask('guide-test' as any, fn)
    task.startKeydown()

    const event = new KeyboardEvent('keydown', { code: 'KeyA' })
    document.onkeydown!(event)

    expect(fn).not.toHaveBeenCalled()

    task.removeKeydownTask('guide-test' as any)
    task.stopKeydown()
  })

  it('closes setting drawer on Escape when no sub-drawer is open', async () => {
    vi.resetModules()
    const closeSettingDrawerMock = vi.fn()
    const closeTopDrawerMock = vi.fn()
    vi.doMock('@/logic/store/state', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: true,
        isSearchFocused: false,
        isInputFocused: false,
        drawerStack: [], // no sub-drawer
      },
      switchSettingDrawerVisible: vi.fn(),
      closeSettingDrawer: closeSettingDrawerMock,
      closeTopDrawer: closeTopDrawerMock,
    }))

    const task = await import('@/logic/task')
    const fn = vi.fn()
    task.addKeydownTask('drawer-test' as any, fn)
    task.startKeydown()

    // Escape triggers closeSettingDrawer (no sub-drawer)
    document.onkeydown!(new KeyboardEvent('keydown', { code: 'Escape' }))
    await vi.waitFor(() => {
      expect(closeSettingDrawerMock).toHaveBeenCalled()
      expect(closeTopDrawerMock).not.toHaveBeenCalled()
    })

    task.removeKeydownTask('drawer-test' as any)
    task.stopKeydown()
  })

  it('closes top sub-drawer on Escape when sub-drawers are open', async () => {
    vi.resetModules()
    const closeSettingDrawerMock = vi.fn()
    const closeTopDrawerMock = vi.fn()
    vi.doMock('@/logic/store/state', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: true,
        isSearchFocused: false,
        isInputFocused: false,
        drawerStack: [{ code: 'setting' }, { code: 'background' }], // sub-drawer open
      },
      switchSettingDrawerVisible: vi.fn(),
      closeSettingDrawer: closeSettingDrawerMock,
      closeTopDrawer: closeTopDrawerMock,
    }))

    const task = await import('@/logic/task')
    const fn = vi.fn()
    task.addKeydownTask('drawer-test' as any, fn)
    task.startKeydown()

    // Escape triggers closeTopDrawer (sub-drawer open)
    document.onkeydown!(new KeyboardEvent('keydown', { code: 'Escape' }))
    await vi.waitFor(() => {
      expect(closeTopDrawerMock).toHaveBeenCalled()
      expect(closeSettingDrawerMock).not.toHaveBeenCalled()
    })

    task.removeKeydownTask('drawer-test' as any)
    task.stopKeydown()
  })

  it('intercepts Escape when setting drawer is visible, other keys pass through', async () => {
    vi.resetModules()
    const closeSettingDrawerMock = vi.fn()
    const closeTopDrawerMock = vi.fn()
    vi.doMock('@/logic/store/state', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: true,
        isSearchFocused: false,
        isInputFocused: false,
        drawerStack: [],
      },
      switchSettingDrawerVisible: vi.fn(),
      closeSettingDrawer: closeSettingDrawerMock,
      closeTopDrawer: closeTopDrawerMock,
    }))

    const task = await import('@/logic/task')
    const fn = vi.fn()
    task.addKeydownTask('drawer-test' as any, fn)
    task.startKeydown()

    // Regular key still triggers keydown tasks
    const event = new KeyboardEvent('keydown', { code: 'KeyA' })
    document.onkeydown!(event)
    expect(fn).toHaveBeenCalledTimes(1)

    // Escape is intercepted
    document.onkeydown!(new KeyboardEvent('keydown', { code: 'Escape' }))
    await vi.waitFor(() => {
      expect(closeSettingDrawerMock).toHaveBeenCalled()
    })

    task.removeKeydownTask('drawer-test' as any)
    task.stopKeydown()
  })
})

describe('timer task system', () => {
  let addTimerTask: (typeof import('@/logic/task'))['addTimerTask']
  let removeTimerTask: (typeof import('@/logic/task'))['removeTimerTask']
  let startTimer: (typeof import('@/logic/task'))['startTimer']
  let stopTimer: (typeof import('@/logic/task'))['stopTimer']

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('@/logic/store/state', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: false,
        isSearchFocused: false,
        isInputFocused: false,
        drawerStack: [],
      },
      switchSettingDrawerVisible: vi.fn(),
    }))

    vi.useFakeTimers()

    const task = await import('@/logic/task')
    addTimerTask = task.addTimerTask
    removeTimerTask = task.removeTimerTask
    startTimer = task.startTimer
    stopTimer = task.stopTimer

    stopTimer()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * 辅助函数：模拟 rAF 回调触发。
   * fake timer 模式下 requestAnimationFrame 被 setTimeout(≈16ms) 模拟，
   * advanceTimersByTime(1000) 推进 1 秒后触发 rAF 回调执行 tick。
   */
  const advanceOneSecond = () => {
    vi.advanceTimersByTime(1000)
  }

  it('calls task immediately when added', () => {
    const fn = vi.fn()
    addTimerTask('tick', fn)
    expect(fn).toHaveBeenCalledTimes(1)
    removeTimerTask('tick')
  })

  it('calls tasks at ~1 second intervals after start', () => {
    const fn = vi.fn()
    addTimerTask('tick', fn) // 1 call (immediate)
    startTimer()

    // 推进 1 秒，rAF 守卫 now - lastTickTime >= 1000 成立，执行 tick
    advanceOneSecond()
    expect(fn).toHaveBeenCalledTimes(2) // 1 immediate + 1 tick

    // 再推进 1 秒
    advanceOneSecond()
    expect(fn).toHaveBeenCalledTimes(3) // 1 + 2

    stopTimer()
    removeTimerTask('tick')
  })

  it('stops calling tasks after stop', () => {
    const fn = vi.fn()
    addTimerTask('tick', fn)
    startTimer()

    advanceOneSecond()
    stopTimer()

    // 停止后继续推进时间，不应再调用
    advanceOneSecond()
    advanceOneSecond()
    advanceOneSecond()
    expect(fn).toHaveBeenCalledTimes(2) // 1 immediate + 1 tick

    removeTimerTask('tick')
  })

  it('does not call removed tasks', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    addTimerTask('tick1', fn1)
    addTimerTask('tick2', fn2)
    startTimer()

    removeTimerTask('tick1')
    advanceOneSecond()

    expect(fn1).toHaveBeenCalledTimes(1) // only initial call
    expect(fn2).toHaveBeenCalledTimes(2) // initial + 1 tick

    stopTimer()
    removeTimerTask('tick2')
  })

  it('auto-starts rAF when adding task to empty map', () => {
    const fn = vi.fn()
    addTimerTask('tick', fn) // 1 call (immediate) + auto-starts rAF

    advanceOneSecond()
    expect(fn).toHaveBeenCalledTimes(2)

    removeTimerTask('tick')
    stopTimer()
  })

  it('auto-stops rAF when tasks become empty', () => {
    const fn = vi.fn()
    addTimerTask('tick', fn)

    removeTimerTask('tick')
    // rAF 已停止，后续推进时间不会触发回调
    advanceOneSecond()
    advanceOneSecond()
    advanceOneSecond()
    expect(fn).toHaveBeenCalledTimes(1) // only initial call

    stopTimer()
  })

  it('restarts rAF when adding task after all were removed', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    addTimerTask('tick1', fn1)
    removeTimerTask('tick1') // rAF stopped
    expect(fn1).toHaveBeenCalledTimes(1) // only initial call

    // 重新添加任务，rAF 应自动重启
    addTimerTask('tick2', fn2)
    advanceOneSecond()
    expect(fn2).toHaveBeenCalledTimes(2) // 1 immediate + 1 tick

    stopTimer()
    removeTimerTask('tick2')
  })
})

describe('visibility task system', () => {
  let addVisibilityTask: (typeof import('@/logic/task'))['addVisibilityTask']
  let removeVisibilityTask: (typeof import('@/logic/task'))['removeVisibilityTask']

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('@/logic/store/state', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: false,
        isSearchFocused: false,
        isInputFocused: false,
      },
      switchSettingDrawerVisible: vi.fn(),
    }))
    const task = await import('@/logic/task')
    addVisibilityTask = task.addVisibilityTask
    removeVisibilityTask = task.removeVisibilityTask
  })

  it('adds and removes visibility tasks', () => {
    const fn = vi.fn()
    addVisibilityTask('vis1', fn)
    // No error on add
    removeVisibilityTask('vis1')
    // No error on remove
  })

  it('executes tasks on visibilitychange event', () => {
    const fn = vi.fn()
    addVisibilityTask('vis1', fn)

    document.dispatchEvent(new Event('visibilitychange'))
    expect(fn).toHaveBeenCalledWith(document.hidden)

    removeVisibilityTask('vis1')
  })

  it('does not call removed tasks on visibilitychange', () => {
    const fn = vi.fn()
    addVisibilityTask('vis1', fn)
    removeVisibilityTask('vis1')

    document.dispatchEvent(new Event('visibilitychange'))
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('page focus task system', () => {
  let addPageFocusTask: (typeof import('@/logic/task'))['addPageFocusTask']
  let removePageFocusTask: (typeof import('@/logic/task'))['removePageFocusTask']
  let onPageFocus: (typeof import('@/logic/task'))['onPageFocus']

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('@/logic/store/state', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: false,
        isSearchFocused: false,
        isInputFocused: false,
      },
      switchSettingDrawerVisible: vi.fn(),
    }))
    const task = await import('@/logic/task')
    addPageFocusTask = task.addPageFocusTask
    removePageFocusTask = task.removePageFocusTask
    onPageFocus = task.onPageFocus
  })

  it('adds and removes page focus tasks', () => {
    const fn = vi.fn()
    addPageFocusTask('focus1', fn)
    removePageFocusTask('focus1')
  })

  it('executes tasks when onPageFocus is called', () => {
    const fn = vi.fn()
    addPageFocusTask('focus1', fn)

    onPageFocus()
    expect(fn).toHaveBeenCalledWith(document.hidden)

    removePageFocusTask('focus1')
  })

  it('does not call removed tasks on onPageFocus', () => {
    const fn = vi.fn()
    addPageFocusTask('focus1', fn)
    removePageFocusTask('focus1')

    onPageFocus()
    expect(fn).not.toHaveBeenCalled()
  })
})
