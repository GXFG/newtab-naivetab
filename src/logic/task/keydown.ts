/**
 * @module task/keydown
 * @description keydown 事件分发 — 注册/移除/启停全局键盘事件监听。
 *   返回值约定：返回 true 表示已处理此事件（短路后续 handler），返回 false/undefined 继续传递。
 *   优先级：数字越小越优先。命令(0) > 书签(10) > 书签文件夹(20) > 草稿工具(30)。
 * @dependencies store/state.ts（globalState.isGuideMode/drawerStack）
 * @consumers shortcut/shortcut-executor.ts、newtab/App.vue、各 Widget 按键处理
 * @see docs/architecture/task.md#1-keydown-任务
 */
import {
  globalState,
  closeTopDrawer,
  closeSettingDrawer,
} from '@/logic/store/state'

/** 任务优先级：数字越小越优先 */
export type TaskPriority = 0 | 10 | 20 | 30

interface TaskEntry {
  task: (e: KeyboardEvent) => boolean | void
  priority: TaskPriority
}

const keydownTaskMap = new Map<KeydownTaskKey, TaskEntry>()

export const addKeydownTask = (
  key: KeydownTaskKey,
  task: (e: KeyboardEvent) => boolean | void,
  priority: TaskPriority,
) => {
  keydownTaskMap.set(key, { task, priority })
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

    // 按优先级升序排列，确保命令优先于书签
    const sorted = [...keydownTaskMap.entries()].sort(
      (a, b) => a[1].priority - b[1].priority,
    )
    for (const [, entry] of sorted) {
      if (entry.task(e) === true) break
    }
  }
}

export const stopKeydown = () => {
  document.onkeydown = null
}
