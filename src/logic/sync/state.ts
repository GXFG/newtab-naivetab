/**
 * 同步状态（computed / reactive）与跨上下文监听器
 *
 * 监听器负责保持同一 Chrome Profile 下 newtab ↔ popup ↔ options 之间的配置同步：
 * - setupKeyboardSyncListener：popup 修改书签后通过 chrome.storage.onChanged 通知 newtab
 * - setupLocalStorageSyncListener：options 和 newtab 同设备内通过 localStorage storage 事件同步
 */
import { computed, reactive } from 'vue'
import { log } from '@/logic/util'
import { localConfig, localState } from '@/logic/store'
import { mergeState } from '@/logic/config/merge'
import { parseStoredData } from '@/logic/compress'
import { defaultUploadStatusItem } from '@/logic/config/defaults'

export const isUploadConfigLoading = computed(() => {
  if (
    !Object.prototype.hasOwnProperty.call(
      localState.value,
      'isUploadConfigStatusMap',
    )
  ) {
    return false
  }
  let isLoading = false
  for (const key of Object.keys(localState.value.isUploadConfigStatusMap)) {
    if (localState.value.isUploadConfigStatusMap[key].loading) {
      isLoading = true
      break
    }
  }
  return isLoading
})

/**
 * 最近一次成功同步的时间（取各字段 syncTime 的最大值）
 */
export const lastSyncTime = computed(() => {
  if (
    !Object.prototype.hasOwnProperty.call(
      localState.value,
      'isUploadConfigStatusMap',
    )
  ) {
    return '0'
  }
  let maxTime = 0
  for (const key of Object.keys(localState.value.isUploadConfigStatusMap)) {
    const t = localState.value.isUploadConfigStatusMap[key].syncTime
    if (t > maxTime) maxTime = t
  }
  return maxTime ? dayjs(maxTime).format('YYYY-MM-DD HH:mm:ss') : '0'
})

/**
 * 各 field 在 chrome.storage.sync 中的实际占用字节数（通过 getBytesInUse 获取）
 * key: ConfigField, value: bytes
 */
export const configSizeMap = reactive<Record<string, number>>({})

/**
 * 监听 popup 修改 keyboardBookmark → 自动同步到 newtab 的 localConfig
 *
 * chrome.storage.onChanged 在 popup 调用 flushConfigSync 写入后触发。
 * parseStoredData 自动处理 gzip 压缩数据。
 * 通过 syncId 比对避免本地修改后又触发 onChanged 形成循环更新。
 */
export const setupKeyboardSyncListener = () => {
  chrome.storage.onChanged.addListener((changes) => {
    const key = 'naive-tab-keyboardBookmark'
    if (!changes[key]) return

    const raw = changes[key].newValue as string
    if (!raw || raw.length === 0) return

    return parseStoredData(raw)
      .then((parsed: SyncPayload) => {
        const newSyncId = parsed.syncId
        const currSyncId =
          localState.value.isUploadConfigStatusMap.keyboardBookmark?.syncId

        if (newSyncId === currSyncId) {
          log('Sync keyboardBookmark skipped (same syncId)')
          return
        }

        localState.value.isUploadConfigStatusMap.keyboardBookmark.syncId =
          newSyncId
        localState.value.isUploadConfigStatusMap.keyboardBookmark.syncTime =
          parsed.syncTime
        localState.value.isUploadConfigStatusMap.keyboardBookmark.dirty = false

        localConfig.keyboardBookmark = parsed.data
        log('Sync keyboardBookmark updated from storage.onChanged')
      })
      .catch((e) => {
        log('Sync keyboardBookmark parse error', e)
      })
  })
}

/**
 * 监听同设备其他页面的 localStorage 变化
 * 当 options 和 newtab 同时打开时，保持配置同步
 */
export const setupLocalStorageSyncListener = () => {
  window.addEventListener('storage', (e) => {
    if (!e.key || (!e.key.startsWith('c-') && e.key !== 'l-state')) return
    if (!e.newValue) return
    const newConfig = JSON.parse(e.newValue)
    const field = e.key === 'l-state' ? 'state' : e.key.replace('c-', '')
    if (field !== 'state' && localConfig[field]) {
      if (JSON.stringify(localConfig[field]) === JSON.stringify(newConfig)) {
        return
      }
      localConfig[field] = mergeState(localConfig[field], newConfig)
    }
  })
}
