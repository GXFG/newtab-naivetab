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

const tickLoop = () => {
  const now = Date.now()
  if (now - lastTickTime >= TICK_INTERVAL) {
    for (const task of tasks.values()) {
      task()
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
