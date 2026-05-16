/**
 * 任务调度系统统一导出。
 */
export {
  addKeydownTask,
  removeKeydownTask,
  startKeydown,
  stopKeydown,
} from './keydown'
export { addTimerTask, removeTimerTask, startTimer, stopTimer } from './timer'
export { addVisibilityTask, removeVisibilityTask } from './events'
export { addPageFocusTask, removePageFocusTask, onPageFocus } from './events'
