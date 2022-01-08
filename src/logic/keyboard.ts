import { globalState, isSettingDrawerVisible, toggleIsSettingDrawerVisible } from '@/logic'

const tasks = new Map()

export const addKeyboardTask = (key: string, task: (e: KeyboardEvent) => void) => {
  tasks.set(key, task)
}

export const removeKeyboardTask = (key: string) => {
  tasks.delete(key)
}

export const startKeyboard = () => {
  document.onkeydown = (e: KeyboardEvent) => {
    // 在'搜索框'与'设置抽屉内'忽略按键事件
    if (isSettingDrawerVisible.value || globalState.state.isSearchFocused) {
      if (e.key === 'Escape') {
        toggleIsSettingDrawerVisible(false)
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
