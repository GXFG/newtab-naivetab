/**
 * 层切换 toast 通知
 *
 * 命令路径中，切层命令触发后通过 Port 向前端发送 toast 通知。
 * CS 和新tab页面各自通过 Port 监听，使用自己的方式显示 toast。
 */

import { MSG_SWITCH_BOOKMARK_LAYER, type SwToCsMessage } from '@/types/messages'
import { getCachedKeyboardBookmarkLayers } from '../config/cache'

let portMap: Map<number, chrome.runtime.Port>

/**
 * 初始化 toast 模块，注入 Port 映射。
 * 应在 main.ts 的 portMap 定义后调用。
 */
export const initLayerToast = (pm: Map<number, chrome.runtime.Port>) => {
  portMap = pm
}

/**
 * 向当前活跃 tab 发送层切换 toast 通知（命令路径专用）。
 *
 * 与 storage onChanged 监听器的区别：
 * - 命令路径中 storage.set 值相同时 onChanged 不会触发，此函数确保始终有反馈
 * - CS 和新tab页面统一通过 Port 接收消息，各自使用合适的方式显示 toast
 */
export const sendLayerSwitchToast = async (layerIndex: number) => {
  const layers = getCachedKeyboardBookmarkLayers()
  const folderName = layers?.[layerIndex]?.sourceFolderPath?.split('/').pop()
  if (!folderName) return

  const activeTabs = await chrome.tabs
    .query({ active: true, currentWindow: true })
    .catch(() => [])
  const activeTab = activeTabs[0]
  if (!activeTab?.id) return

  const port = portMap.get(activeTab.id)
  if (port) {
    try {
      port.postMessage({
        type: MSG_SWITCH_BOOKMARK_LAYER,
        folderName,
      } satisfies SwToCsMessage)
    } catch {
      // port may be disconnected, ignore
    }
  }
}
