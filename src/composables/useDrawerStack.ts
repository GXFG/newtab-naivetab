import { watch, type Ref } from 'vue'
import { openDrawer } from '@/logic/store/state'

/**
 * 将子 Drawer 的显示状态同步到全局 drawerStack，
 * 使得 ESC 能逐层关闭，而非直接关闭 Setting 主面板。
 */
export const useDrawerStack = (
  code: string,
  showRef: Ref<boolean>,
  onClose: () => void,
) => {
  let close: (() => void) | undefined

  watch(showRef, (visible) => {
    if (visible) {
      close = openDrawer(code, onClose)
    } else {
      close?.()
    }
  })
}
