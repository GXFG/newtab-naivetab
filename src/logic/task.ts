import { globalState, switchSettingDrawerVisible } from '@/logic/store'

const keydownTaskMap = new Map<
  KeydownTaskKey,
  (e: KeyboardEvent) => boolean | void
>()

/**
 * 注册 keydown 任务
 *
 * 返回值约定：
 * - 返回 true 表示该任务已处理此事件，后续任务可据此跳过
 * - 返回 false / undefined 表示未处理，继续传递给其他任务
 *
 * 注意：当前 startKeydown 遍历所有任务且不短路（不检查返回值）。
 * 防冲突由各 task 内部的修饰键过滤保证：
 * - globalShortcut 需要至少一个修饰键（ctrl/shift/alt/meta）
 * - keyboard widget 明确过滤 ctrlKey || metaKey
 * - bookmarkFolder 仅响应 Escape
 *
 * 返回值短路：task 返回 true 表示已处理此事件，后续 task 不再执行。
 * 这样可以避免同一按键被多个 handler 重复处理。
 */
export const addKeydownTask = (
  key: KeydownTaskKey,
  task: (e: KeyboardEvent) => boolean | void,
) => {
  keydownTaskMap.set(key, task)
}

export const removeKeydownTask = (key: KeydownTaskKey) => {
  keydownTaskMap.delete(key)
}

export const startKeydown = () => {
  document.onkeydown = (e: KeyboardEvent) => {
    if (globalState.isGuideMode) {
      return
    }
    // 设置面板打开时，Escape 用于关闭面板
    if (globalState.isSettingDrawerVisible && e.code === 'Escape') {
      nextTick(() => {
        switchSettingDrawerVisible(false)
      })
      return
    }

    for (const task of keydownTaskMap.values()) {
      if (task(e) === true) break
    }
  }
}

export const stopKeydown = () => {
  document.onkeydown = null
}

let timer: ReturnType<typeof setInterval> | undefined
const tasks = new Map()

export const addTimerTask = (key: string, task: () => void) => {
  task()
  tasks.set(key, task)
}

export const removeTimerTask = (key: string) => {
  tasks.delete(key)
}

export const startTimer = () => {
  timer = setInterval(() => {
    for (const task of tasks.values()) {
      task()
    }
  }, 1000)
}

export const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

const visibilityTasks = new Map()

export const addVisibilityTask = (
  key: string,
  task: (isHidden: boolean) => void,
) => {
  visibilityTasks.set(key, task)
}

export const removeVisibilityTask = (key: string) => {
  visibilityTasks.delete(key)
}

document.addEventListener('visibilitychange', () => {
  for (const task of visibilityTasks.values()) {
    task(document.hidden)
  }
})

const pageFocusTasks = new Map()

export const addPageFocusTask = (
  key: string,
  task: (isHidden: boolean) => void,
) => {
  pageFocusTasks.set(key, task)
}

export const removePageFocusTask = (key: string) => {
  pageFocusTasks.delete(key)
}

export const onPageFocus = () => {
  for (const task of pageFocusTasks.values()) {
    task(document.hidden)
  }
}
