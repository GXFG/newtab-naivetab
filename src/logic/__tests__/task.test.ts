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
    vi.doMock('@/logic/store', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: false,
        isSearchFocused: false,
        isInputFocused: false,
      },
      switchSettingDrawerVisible: vi.fn(),
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
    vi.doMock('@/logic/store', () => ({
      globalState: {
        isGuideMode: true,
        isSettingDrawerVisible: false,
        isSearchFocused: false,
        isInputFocused: false,
      },
      switchSettingDrawerVisible: vi.fn(),
    }))

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

  it('only intercepts Escape when setting drawer is visible, other keys pass through', async () => {
    vi.resetModules()
    const switchMock = vi.fn()
    vi.doMock('@/logic/store', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: true,
        isSearchFocused: false,
        isInputFocused: false,
      },
      switchSettingDrawerVisible: switchMock,
    }))

    const task = await import('@/logic/task')
    const fn = vi.fn()
    task.addKeydownTask('drawer-test' as any, fn)
    task.startKeydown()

    // Regular key still triggers keydown tasks
    const event = new KeyboardEvent('keydown', { code: 'KeyA' })
    document.onkeydown!(event)
    expect(fn).toHaveBeenCalledTimes(1)

    // Escape triggers switchSettingDrawerVisible(false)
    document.onkeydown!(new KeyboardEvent('keydown', { code: 'Escape' }))
    // Escape is handled via nextTick, so we wait
    await vi.waitFor(() => {
      expect(switchMock).toHaveBeenCalledWith(false)
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
    vi.doMock('@/logic/store', () => ({
      globalState: {
        isGuideMode: false,
        isSettingDrawerVisible: false,
        isSearchFocused: false,
        isInputFocused: false,
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

  it('calls task immediately when added', () => {
    const fn = vi.fn()
    addTimerTask('tick', fn)
    expect(fn).toHaveBeenCalledTimes(1)
    removeTimerTask('tick')
  })

  it('calls tasks at 1 second intervals after start', () => {
    const fn = vi.fn()
    addTimerTask('tick', fn)
    startTimer()

    // Initial call + 2 ticks
    vi.advanceTimersByTime(2000)
    expect(fn).toHaveBeenCalledTimes(3) // 1 immediate + 2 interval

    stopTimer()
    removeTimerTask('tick')
  })

  it('stops calling tasks after stop', () => {
    const fn = vi.fn()
    addTimerTask('tick', fn)
    startTimer()

    vi.advanceTimersByTime(1000)
    stopTimer()

    // Advance more, but timer is stopped
    vi.advanceTimersByTime(5000)
    expect(fn).toHaveBeenCalledTimes(2) // 1 immediate + 1 interval

    removeTimerTask('tick')
  })

  it('does not call removed tasks', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    addTimerTask('tick1', fn1)
    addTimerTask('tick2', fn2)
    startTimer()

    removeTimerTask('tick1')
    vi.advanceTimersByTime(1000)

    expect(fn1).toHaveBeenCalledTimes(1) // only initial call
    expect(fn2).toHaveBeenCalledTimes(2) // initial + 1 interval

    stopTimer()
    removeTimerTask('tick2')
  })
})

describe('visibility task system', () => {
  let addVisibilityTask: (typeof import('@/logic/task'))['addVisibilityTask']
  let removeVisibilityTask: (typeof import('@/logic/task'))['removeVisibilityTask']

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('@/logic/store', () => ({
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
    vi.doMock('@/logic/store', () => ({
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
