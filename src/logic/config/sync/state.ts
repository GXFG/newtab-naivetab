/**
 * @module config/sync/state
 * @description 同步状态（computed/reactive）与跨上下文监听器。
 *   保持同一 Chrome Profile 下 newtab ↔ popup ↔ options 之间的配置同步：
 *   - setupKeyboardSyncListener：popup 修改 keyboardBookmark/keyboardCommand 后通过 chrome.storage.onChanged 通知 newtab
 *   - setupLocalStorageSyncListener：options 和 newtab 同设备内通过 localStorage storage 事件同步
 * @dependencies config/merge.ts（mergeState）、config/compress.ts（parseStoredData）、config/state.ts、
 *   config/sync/upload.ts（isPendingWrite 预期写入注册表）
 * @consumers config/sync/loader.ts（setupPageConfigSync 中调用）、newtab/App.vue
 *   同步 keyboardBookmark 和 keyboardCommand 配置，确保 popup/CS/newtab 间配置一致
 * @see docs/architecture/storage.md#跨上下文同步
 */
import { computed, reactive } from 'vue'
import { log } from '@/logic/utils/common'
import { localConfig, localState } from '@/logic/config/state'
import { mergeState } from '@/logic/config/merge'
import { parseStoredData } from '@/logic/config/compress'
import { isPendingWrite } from './pending-writes'

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
    if (localState.value.isUploadConfigStatusMap[key as ConfigField].loading) {
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
    const t =
      localState.value.isUploadConfigStatusMap[key as ConfigField].syncTime
    if (t > maxTime) maxTime = t
  }
  return maxTime ? dayjs(maxTime).format('YYYY-MM-DD HH:mm:ss') : '0'
})

/**
 * 各 field 在 chrome.storage.sync 中的实际占用字节数（通过 getBytesInUse 获取）
 * key: ConfigField, value: bytes
 * 注意：此映射仅用于 UI 展示（setting 面板显示云同步占用），不用于任何逻辑判断。
 * loadRemoteConfig 中异步更新时可能与 upload.ts 中同步写入短暂不一致，不影响功能。
 */
export const configSizeMap = reactive<Record<string, number>>({})

const SYNC_FIELD_KEYS = ['keyboardBookmark', 'keyboardCommand'] as const
type SyncField = (typeof SYNC_FIELD_KEYS)[number]
const SYNC_KEY_MAP: Record<SyncField, string> = {
  keyboardBookmark: 'naive-tab-keyboardBookmark',
  keyboardCommand: 'naive-tab-keyboardCommand',
}

/**
 * 监听 popup 修改配置 → 自动同步到 other context 的 localConfig
 *
 * chrome.storage.onChanged 在 popup 调用 flushConfigSync 写入后触发。
 * parseStoredData 自动处理 gzip 压缩数据。
 * 双重防护：先检查 pendingWrites（自身发起的写入），再检查 syncId 守卫（兜底）。
 *
 * ## 已知行为：Popup 覆盖 Newtab 本地修改
 *
 * 若 Newtab 已有 dirty=true 的本地修改（2000ms 防抖尚未触发上传），此时 Popup 的
 * flushConfigSync 写入触发 onChanged，本函数会：
 *   1. 将 localConfig[field] 替换为 Popup 的数据（第 135 行）→ Newtab 本地修改丢失
 *   2. 设置 dirty=false（第 130 行）
 *   3. 第 135 行的赋值触发 deep watcher → genWatchUploadConfigFn 再次置 dirty=true
 *   4. 后续 uploadConfigFn 检测 MD5 与 Popup syncId 相同 → 跳过上传 + 清除 dirty
 *      → syncStatus='idle' → handleMissedUploadConfig 不再无效重试
 *
 * 触发条件苛刻：需在 2000ms 窗口内同时在 Newtab 和 Popup 修改 keyboardBookmark 或
 * keyboardCommand（唯二有跨上下文 onChanged 同步的字段）。概率极低，且丢失的是
 * Newtab 侧尚未上传的中间修改，Popup 侧的修改（用户更近的主动操作）被保留。
 * 当前选择接受此 tradeoff，不引入 skip flag 机制增加复杂度。
 */
const syncConfigFromOnChange = (
  changes: chrome.storage.StorageChange,
  field: SyncField,
) => {
  const key = SYNC_KEY_MAP[field]
  const change = (changes as any)[key]
  if (!change) return

  const raw = change.newValue as string
  if (!raw || raw.length === 0) return

  return parseStoredData(raw)
    .then((parsed: SyncPayload) => {
      const newSyncId = parsed.syncId

      // 第一道防线：pendingWrites 预期写入注册表
      // 命中说明是当前页面发起的 chrome.storage.sync.set 写入，直接跳过
      if (isPendingWrite(newSyncId)) {
        log(`Sync ${field} skipped (pending write)`)
        return
      }

      // 第二道防线：syncId 兜底（popup 等其他上下文写入的场景）
      const currSyncId = localState.value.isUploadConfigStatusMap[field]?.syncId

      if (newSyncId === currSyncId) {
        log(`Sync ${field} skipped (same syncId)`)
        return
      }

      localState.value.isUploadConfigStatusMap[field].syncId = newSyncId
      localState.value.isUploadConfigStatusMap[field].syncTime = parsed.syncTime
      localState.value.isUploadConfigStatusMap[field].dirty = false
      localState.value.isUploadConfigStatusMap[field].retryCount = 0
      localState.value.isUploadConfigStatusMap[field].lastError = ''
      localState.value.isUploadConfigStatusMap[field].syncStatus = 'idle'

      localConfig[field] = parsed.data
      log(`Sync ${field} updated from storage.onChanged`)
    })
    .catch((e) => {
      log(`Sync ${field} parse error`, e)
    })
}

export const setupKeyboardSyncListener = () => {
  chrome.storage.onChanged.addListener((changes) => {
    for (const field of SYNC_FIELD_KEYS) {
      syncConfigFromOnChange(changes, field)
    }
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
    if (field !== 'state' && localConfig[field as ConfigField]) {
      // 注意：使用 JSON.stringify 比较存在 key 顺序不同的误判可能，最坏情况是多
      // 执行一次 mergeState（不会导致数据错误，mergeState 以默认配置为模板会产出
      // 相同结果）。如果未来发现频繁不必要的 merge，可替换为深比较函数。
      if (
        JSON.stringify(localConfig[field as ConfigField]) ===
        JSON.stringify(newConfig)
      ) {
        return
      }
      localConfig[field as ConfigField] = mergeState(
        localConfig[field as ConfigField],
        newConfig,
      ) as any
    }
  })
}
