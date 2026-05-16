/**
 * useKeycapDrag
 *
 * 键帽拖拽交换逻辑的通用组合式函数。
 * BaseNaiveBookmarkManager（source=2）和 BaseSystemBookmarkManager（source=1）共用。
 *
 * 交互模式：HTML5 原生 draggable，拖拽事件绑定在外层 wrap div。
 */

import { ref, computed } from 'vue'

interface UseKeycapDragOptions {
  /** 判断某个键帽是否可以作为拖拽源 */
  canDrag: (code: string) => boolean
  /** 交换两个键帽的数据（同步或异步） */
  swapData: (sourceCode: string, targetCode: string) => void | Promise<void>
  /** 交换完成后的回调，通常用于更新选中键帽、刷新数据等 */
  onAfterSwap?: (targetCode: string) => void
}

export function useKeycapDrag({
  canDrag,
  swapData,
  onAfterSwap,
}: UseKeycapDragOptions) {
  const currDragCode = ref('')
  const targetDragCode = ref('')

  const handleDragStart = (code: string) => {
    if (!canDrag(code)) return
    currDragCode.value = code
  }

  const handleDragOver = (e: Event, code: string) => {
    e.preventDefault()
    targetDragCode.value = code
  }

  const handleDragEnd = async () => {
    const source = currDragCode.value
    const target = targetDragCode.value

    currDragCode.value = ''
    targetDragCode.value = ''

    if (!source || !target || source === target) return

    await swapData(source, target)
    onAfterSwap?.(target)
  }

  /** 是否为放置目标（用于高亮渲染） */
  const isDropTarget = (code: string) =>
    targetDragCode.value === code && currDragCode.value !== code

  return {
    currDragCode,
    targetDragCode,
    isDropTarget,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
