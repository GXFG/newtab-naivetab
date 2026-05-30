import { computed } from 'vue'
import { localConfig } from '@/logic/config/state'
import { cachedActiveLayer, switchLayer } from '@/logic/keyboard/bookmark-state'

/**
 * 键盘滚轮切换书签层。
 *
 * - 同向连续滚动 → 只切一层，后续事件锁住
 * - 方向改变 → 立即解锁 + 切换
 * - 事件流停止 120ms → 自动解锁（同向新手势可再次触发）
 *
 * 通过 |deltaY| > |deltaX| 过滤横向手势。
 */
export function useKeyboardLayerWheel() {
  const configuredLayers = computed(() => {
    const { layers } = localConfig.keyboardBookmark
    return layers
      .map((l, i) => ({ index: i, path: l.sourceFolderPath || '' }))
      .filter((l) => l.path)
  })

  let lastSign = 0
  let switched = false
  let endTimer: ReturnType<typeof setTimeout> | null = null

  const handleWheel = (e: WheelEvent) => {
    if (configuredLayers.value.length <= 1) return

    // 忽略横向手势
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return

    e.preventDefault()

    // 微小偏移（回弹）不影响状态
    if (Math.abs(e.deltaY) < 5) return

    const currentSign = Math.sign(e.deltaY)

    // 持续有事件到来 → 重置手势结束计时器
    clearTimeout(endTimer as ReturnType<typeof setTimeout>)
    endTimer = setTimeout(() => {
      switched = false
    }, 120)

    // 方向改变 → 立即解锁
    if (currentSign !== lastSign) {
      switched = false
    }
    lastSign = currentSign

    // 同向已切过 → 忽略
    if (switched) return

    const configured = configuredLayers.value.map((l) => l.index)
    const pos = configured.indexOf(cachedActiveLayer.value)
    if (pos === -1) return

    const next =
      currentSign > 0
        ? configured[(pos + 1) % configured.length]
        : configured[(pos - 1 + configured.length) % configured.length]

    switchLayer(next)
    switched = true
  }

  return { handleWheel }
}
