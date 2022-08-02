import { globalState, switchSettingDrawerVisible } from '@/logic'

const taskMap = new Map()

export const addKeyboardTask = (key: string, task: (e: KeyboardEvent) => void) => {
  taskMap.set(key, task)
}

export const removeKeyboardTask = (key: string) => {
  taskMap.delete(key)
}

export const startKeyboard = () => {
  document.onkeydown = (e: KeyboardEvent) => {
    // 在'搜索框'、'备忘录'、'设置抽屉'内时忽略按键事件
    if (globalState.isSettingDrawerVisible || globalState.isSearchFocused || globalState.isMemoFocused) {
      if (e.key === 'Escape') {
        switchSettingDrawerVisible(false)
      }
      return
    }
    for (const task of taskMap.values()) {
      task(e)
    }
  }
}

export const stopKeyboard = () => {
  document.onkeydown = null
}
