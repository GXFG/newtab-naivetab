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
    addKeydownTask('test-task' as any, fn, 0)
    // Task is registered (no error thrown)
    removeKeydownTask('test-task' as any)
    // Task is removed (no error thrown)
  })

  it('calls registered tasks when key is pressed', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    addKeydownTask('task1' as any, fn1, 0)
    addKeydownTask('task2' as any, fn2, 0)
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
    addKeydownTask('task1' as any, fn1, 0)
    addKeydownTask('task2' as any, fn2, 0)
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
    task.addKeydownTask('guide-test' as any, fn, 0)
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
    task.addKeydownTask('drawer-test' as any, fn, 0)
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
    task.addKeydownTask('drawer-test' as any, fn, 0)
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
    task.addKeydownTask('drawer-test' as any, fn, 0)
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

  it('单个任务抛错不影响同批次其它任务与后续帧', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let armed = false
    const bad = vi.fn(() => {
      if (armed) throw new Error('boom')
    })
    const good = vi.fn()

    // 注册时的首次执行不在隔离范围内（错误要抛给调用方），所以先不武装
    addTimerTask('bad', bad)
    addTimerTask('good', good)
    good.mockClear()
    armed = true

    advanceOneSecond()
    expect(good).toHaveBeenCalledTimes(1)

    // 关键断言：rAF 链没有断，下一秒还能继续调度
    advanceOneSecond()
    expect(good).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalled()

    removeTimerTask('bad')
    removeTimerTask('good')
    errorSpy.mockRestore()
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

describe('daily task system', () => {
  let addDailyTask: (typeof import('@/logic/task'))['addDailyTask']
  let removeDailyTask: (typeof import('@/logic/task'))['removeDailyTask']
  let startTimer: (typeof import('@/logic/task'))['startTimer']
  let stopTimer: (typeof import('@/logic/task'))['stopTimer']

  /** 与 timer 测试一致：fake timer 下 rAF 被模拟成 setTimeout(≈16ms) */
  const advanceOneSecond = () => vi.advanceTimersByTime(1000)

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
      closeSettingDrawer: vi.fn(),
      closeTopDrawer: vi.fn(),
    }))

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 7, 23, 59, 30))

    const task = await import('@/logic/task')
    addDailyTask = task.addDailyTask
    removeDailyTask = task.removeDailyTask
    startTimer = task.startTimer
    stopTimer = task.stopTimer
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('注册即执行一次', () => {
    const fn = vi.fn()
    addDailyTask('cal', fn)
    expect(fn).toHaveBeenCalledTimes(1)
    removeDailyTask('cal')
  })

  it('同一天内反复 tick 不会重复触发', () => {
    const fn = vi.fn()
    addDailyTask('cal', fn)

    for (let i = 0; i < 10; i += 1) advanceOneSecond()

    expect(fn).toHaveBeenCalledTimes(1)
    removeDailyTask('cal')
  })

  it('跨过午夜触发一次，之后同一天不再触发', () => {
    const fn = vi.fn()
    addDailyTask('cal', fn)

    vi.setSystemTime(new Date(2026, 10, 8, 0, 0, 1))
    advanceOneSecond()
    expect(fn).toHaveBeenCalledTimes(2)

    advanceOneSecond()
    expect(fn).toHaveBeenCalledTimes(2)

    removeDailyTask('cal')
  })

  it('多个消费者共享同一次比较，各自都被触发', () => {
    const a = vi.fn()
    const b = vi.fn()
    addDailyTask('calendar', a)
    addDailyTask('date', b)

    vi.setSystemTime(new Date(2026, 10, 8, 0, 0, 1))
    advanceOneSecond()

    expect(a).toHaveBeenCalledTimes(2)
    expect(b).toHaveBeenCalledTimes(2)

    removeDailyTask('calendar')
    removeDailyTask('date')
  })

  it('回调拿到的是同一个触发时刻', () => {
    const received: Date[] = []
    const a = (now: Date) => received.push(now)
    const b = (now: Date) => received.push(now)
    addDailyTask('a', a)
    addDailyTask('b', b)

    vi.setSystemTime(new Date(2026, 10, 8, 0, 0, 1))
    advanceOneSecond()

    // 首次注册各一次 + 跨天各一次
    expect(received).toHaveLength(4)
    expect(received[2].getTime()).toBe(received[3].getTime())

    removeDailyTask('a')
    removeDailyTask('b')
  })

  it('一个消费者抛错不影响其它消费者', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bad = vi.fn(() => {
      throw new Error('boom')
    })
    const good = vi.fn()
    addDailyTask('bad', bad)
    addDailyTask('good', good)

    vi.setSystemTime(new Date(2026, 10, 8, 0, 0, 1))
    expect(() => advanceOneSecond()).not.toThrow()

    expect(good).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalled()

    removeDailyTask('bad')
    removeDailyTask('good')
  })

  it('移除后不再触发', () => {
    const fn = vi.fn()
    addDailyTask('cal', fn)
    removeDailyTask('cal')

    vi.setSystemTime(new Date(2026, 10, 8, 0, 0, 1))
    advanceOneSecond()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  /**
   * 守住 addDailyTask 里「先立基线再注册 timer」的顺序：
   * 少了那一步，addTimerTask 立即执行的那次 checkDayChange 会拿**旧的** lastDayKey
   * 去比，把新消费者当成跨天补跑一次，叠加注册时的显式调用就是连跑两次。
   */
  it('清空后跨天再注册只初始化一次，不会连跑两次', () => {
    const first = vi.fn()
    addDailyTask('cal', first)
    removeDailyTask('cal')

    // 期间跨过午夜：基线还停在昨天
    vi.setSystemTime(new Date(2026, 10, 8, 8, 0, 0))

    const second = vi.fn()
    addDailyTask('date', second)

    expect(second).toHaveBeenCalledTimes(1)
    removeDailyTask('date')
  })

  it('最后一个消费者移除后共享 timer 一起停掉', () => {
    const fn = vi.fn()
    addDailyTask('cal', fn)
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    removeDailyTask('cal')
    expect(vi.getTimerCount()).toBe(0)
  })

  /**
   * 注销一个没注册过的 key 必须是纯空操作：否则 removeTimerTask 会顺带把
   * 不属于 daily 的 rAF 循环停掉。这里复现的是「App 已 startTimer、timer map 还是空的」
   * 那个窗口——此时 daily 根本没注册过东西，没有资格摘掉别人的循环。
   */
  it('移除未注册的 key 不会误停 App 启动的 rAF 循环', () => {
    startTimer()
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    removeDailyTask('unknown')

    expect(vi.getTimerCount()).toBeGreaterThan(0)
    stopTimer()
  })

  it('跨年边界（12-31 → 01-01）也判定为跨天', () => {
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 30))
    const fn = vi.fn()
    addDailyTask('cal', fn)

    vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 1))
    advanceOneSecond()

    expect(fn).toHaveBeenCalledTimes(2)
    removeDailyTask('cal')
  })

  it('睡眠跳过多个整天只补触发一次', () => {
    const fn = vi.fn()
    addDailyTask('cal', fn)

    vi.setSystemTime(new Date(2026, 10, 10, 8, 0, 0))
    advanceOneSecond()

    expect(fn).toHaveBeenCalledTimes(2)
    removeDailyTask('cal')
  })
})
