/**
 * @module task/timer
 * @description rAF 定时器系统 — 基于 requestAnimationFrame + 节流（1s），
 *   相比 setInterval 在后台标签页自动暂停，恢复后自动继续。
 *   所有秒级任务共享此定时器，避免每个 Widget 各起一个。
 * @dependencies 无外部依赖
 * @consumers ClockDigital/Calendar/News/Weather 等 Widget 定时刷新
 * @see docs/architecture/task.md#2-timer-任务
 */
let rafId: number | null = null
let lastTickTime = 0
const TICK_INTERVAL = 1000

const tasks = new Map<string, () => void>()

/**
 * 逐个任务 try/catch。
 *
 * 不加这一层时：任一 task 抛错会中断整个 for，后面的任务本次不执行，
 * 而且 `rafId = requestAnimationFrame(tickLoop)` 也跑不到 —— rAF 链就此断开，
 * 所有定时任务（时钟、倒计时、日历）永久冻结，直到页面重载。
 * 隔离后，单个任务出错只记日志，其余任务与下一帧照常。
 *
 * 注册时的首次执行（addTimerTask 里的 task()）**刻意不包**：那里只有一个消费者，
 * 把错误抛回调用方（组件 setup）比静默吞掉更容易被发现。
 */
const tickLoop = () => {
  const now = Date.now()
  if (now - lastTickTime >= TICK_INTERVAL) {
    for (const [key, task] of tasks) {
      try {
        task()
      } catch (error) {
        console.error(`[task:timer] timer task "${key}" failed:`, error)
      }
    }
    lastTickTime = now
  }
  rafId = requestAnimationFrame(tickLoop)
}

export const addTimerTask = (key: string, task: () => void) => {
  task()
  tasks.set(key, task)
  if (rafId === null) {
    lastTickTime = 0
    rafId = requestAnimationFrame(tickLoop)
  }
}

export const removeTimerTask = (key: string) => {
  tasks.delete(key)
  if (tasks.size === 0 && rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

export const startTimer = () => {
  if (rafId !== null) return
  lastTickTime = 0
  rafId = requestAnimationFrame(tickLoop)
}

export const stopTimer = () => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}
