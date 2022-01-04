import { isSettingDrawerVisible, toggleIsSettingDrawerVisible } from '@/logic'

const tasks = new Map()

export const addKeyboardTask = (key: string, task: (e: KeyboardEvent) => void) => {
  tasks.set(key, task)
}

export const removeKeyboardTask = (key: string) => {
  tasks.delete(key)
}

export const startKeyboard = () => {
  document.onkeydown = (e: KeyboardEvent) => {
    if (isSettingDrawerVisible.value) {
      if (e.key === 'Escape') {
        toggleIsSettingDrawerVisible()
      }
      return
    }
    for (const task of tasks.values()) {
      task(e)
    }
  }
}

export const stopKeyboard = () => {
  document.onkeydown = null
}
