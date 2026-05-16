/**
 * @module task/keydown
 * @description keydown 事件分发 — 注册/移除/启停全局键盘事件监听。
 *   返回值约定：返回 true 表示已处理此事件（短路后续 handler），返回 false/undefined 继续传递。
 * @dependencies store/state.ts（globalState.isGuideMode/drawerStack）
 * @consumers shortcut/shortcut-executor.ts、newtab/App.vue、各 Widget 按键处理
 * @see docs/architecture/task.md#1-keydown-任务
 */
import {
  globalState,
  closeTopDrawer,
  closeSettingDrawer,
} from '@/logic/store/state'

const keydownTaskMap = new Map<
  KeydownTaskKey,
  (e: KeyboardEvent) => boolean | void
>()

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
    if (globalState.isSettingDrawerVisible && e.code === 'Escape') {
      nextTick(() => {
        if (globalState.drawerStack.length > 1) {
          closeTopDrawer()
        } else {
          closeSettingDrawer()
        }
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
