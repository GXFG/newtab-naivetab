/**
 * SW 端书签层 keymap 构建
 *
 * 切层命令触发时，SW 直接构建新层的 systemKeymap 并写入 chrome.storage.local，
 * 不依赖 newtab 页面是否存在。
 *
 * 依赖关系：
 * - chrome.bookmarks API（optional_permission）
 * - parseBookmarkFolder（纯逻辑，可复用）
 */

import { log } from '@/logic/utils/common'
import { parseBookmarkFolder } from '@/logic/bookmark/parser'
import {
  ALL_KEYBOARD_CODES,
  SYSTEM_KEYMAP_STORAGE_KEY,
  ACTIVE_LAYER_STORAGE_KEY,
} from '@/logic/keyboard/keyboard-constants'
import {
  getCachedKeyboardBookmarkConfig,
  buildLayerKeymapComplete,
} from '../config/cache'

/**
 * 构建指定层的 systemKeymap 并写入 chrome.storage.local
 * @param layerIndex 层索引（0-3）
 * @returns 构建的 keymap，失败时返回空对象
 *
 * 异常处理说明：
 * - 层未配置（无 sourceFolderPath）：静默跳过，不写入 storage（调用方不会收到 toast）。
 *   这是有意设计：用户未配置的层不应触发切层反馈。
 * - 书签权限未授予（chrome.bookmarks 不可用）：catch 返回空 keymap。
 *   不在此处请求权限，权限请求由用户在 newtab 设置面板主动触发。
 * - 书签文件夹被删除：parseBookmarkFolder 返回空数组，写入空 keymap。
 *   toast 正常显示，但书签快捷键暂时无响应，直到用户重新配置或删除该层。
 */
export const buildAndSaveLayerKeymap = async (
  layerIndex: number,
): Promise<Record<string, { url: string; name: string }>> => {
  const config = getCachedKeyboardBookmarkConfig()
  const layers = config?.layers ?? []
  const layer = layers[layerIndex]
  if (!layer?.sourceFolderPath) {
    log(`Layer ${layerIndex} not configured, skipping keymap build`)
    buildLayerKeymapComplete()
    return {}
  }

  try {
    const result = await parseBookmarkFolder(
      layer.sourceFolderPath,
      ALL_KEYBOARD_CODES,
    )

    const keymap = Object.fromEntries(
      result.entries.map((e) => [e.code, { url: e.url, name: e.name || '' }]),
    )

    // 先写 keymap，再写层索引（同一 chrome.storage.local.set() 调用，原子写入）。
    // 确保 SW 的 keymap 缓存（config/cache.ts onChanged）先更新，
    // 书签快捷键到达时已读到新层数据。
    await chrome.storage.local.set({
      [SYSTEM_KEYMAP_STORAGE_KEY]: keymap,
      [ACTIVE_LAYER_STORAGE_KEY]: layerIndex,
    })
    log(
      `Built keymap for layer ${layerIndex}: ${Object.keys(keymap).length} entries`,
    )
    return keymap
  } catch (e) {
    log('Build layer keymap error:', e)
    buildLayerKeymapComplete()
    // 注意：buildLayerKeymapComplete() 在所有不写入 storage 的路径中调用：
    // 1. 此处（异常路径）：不写入 storage、不触发 onChanged，必须在此清除。
    // 2. 函数入口提前返回（层未配置路径，第 44 行）：同上逻辑。
    // 成功路径不在此调用，等待 onChanged 中调用 buildLayerKeymapComplete()，
    // 确保标志位在 storage 实际更新（cachedSystemKeymap 已刷新）后才释放，
    // 覆盖异步解析期的窗口。
    return {}
  }
}
