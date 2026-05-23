/**
 * @module task/events
 * @description 页面事件监听 — visibilitychange + pageFocus 任务的注册与分发。
 *   visibilitychange 由浏览器自动触发，pageFocus 由 App.vue 手动调用。
 * @consumers 各 Widget 数据刷新逻辑（News/Weather/Clock 等）
 * @see docs/architecture/task.md#3-visibility-任务、#4-pagefocus-任务
 */

const visibilityTasks = new Map<string, (isHidden: boolean) => void>()

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

const pageFocusTasks = new Map<string, (isHidden: boolean) => void>()

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
