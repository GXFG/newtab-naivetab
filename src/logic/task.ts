import { globalState, switchSettingDrawerVisible } from '@/logic'

const keydownTaskMap = new Map()

export const addKeydownTask = (key: string, task: (e: KeyboardEvent) => void) => {
  keydownTaskMap.set(key, task)
}

export const removeKeydownTask = (key: string) => {
  keydownTaskMap.delete(key)
}

export const startKeydown = () => {
  document.onkeydown = (e: KeyboardEvent) => {
    // 在'搜索框'、'备忘录'、'设置抽屉'内时忽略按键事件
    if (globalState.isSettingDrawerVisible || globalState.isSearchFocused || globalState.isMemoFocused) {
      if (e.key === 'Escape') {
        switchSettingDrawerVisible(false)
      }
      return
    }
    for (const task of keydownTaskMap.values()) {
      task(e)
    }
  }
}

let timer: NodeJS.Timeout
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
  clearInterval(timer)
}

const visibilityTasks = new Map()

export const addVisibilityTask = (key: string, task: (isHidden: boolean) => void) => {
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

export const addPageFocusTask = (key: string, task: (isHidden: boolean) => void) => {
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
