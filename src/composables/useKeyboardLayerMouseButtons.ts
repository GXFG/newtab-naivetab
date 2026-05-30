import { computed } from 'vue'
import { localConfig } from '@/logic/config/state'
import { cachedActiveLayer, switchLayer } from '@/logic/keyboard/bookmark-state'

/**
 * 鼠标前进/后退键切换书签层。
 *
 * - 后退键（button 3）→ 下一层
 * - 前进键（button 4）→ 上一层
 */
export function useKeyboardLayerMouseButtons() {
  const configuredLayers = computed(() => {
    const { layers } = localConfig.keyboardBookmark
    return layers
      .map((l, i) => ({ index: i, path: l.sourceFolderPath || '' }))
      .filter((l) => l.path)
  })

  const handleMouseDown = (e: MouseEvent) => {
    if (configuredLayers.value.length <= 1) return

    const configured = configuredLayers.value.map((l) => l.index)
    const pos = configured.indexOf(cachedActiveLayer.value)
    if (pos === -1) return

    let next: number | null = null

    if (e.button === 3) {
      // 后退键 → 下一层
      next = configured[(pos + 1) % configured.length]
    } else if (e.button === 4) {
      // 前进键 → 上一层
      next = configured[(pos - 1 + configured.length) % configured.length]
    }

    if (next !== null) {
      e.preventDefault()
      switchLayer(next)
    }
  }

  return { handleMouseDown }
}
