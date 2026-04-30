/**
 * 同步系统核心模块 - Chrome 云同步
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                           同步系统架构说明                                   │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │  【存储架构】                                                               │
 * │  本地: localStorage 中每个配置项单独存储 c-{field}                         │
 * │  云端: chrome.storage.sync 中每个配置项单独存储 naive-tab-{field}          │
 * │  状态: localState 中维护每个配置项的同步状态 isUploadConfigStatusMap      │
 * │                                                                             │
 * │  【数据结构】                                                               │
 * │  SyncPayload: { syncTime, syncId, appVersion, data }                      │
 * │  - syncTime: 配置最后修改时间戳                                             │
 * │  - syncId: MD5 哈希，用于快速判断内容是否变化                                │
 * │  - appVersion: 生成该数据的客户端版本，用于版本感知合并                       │
 * │  - data: 实际配置数据                                                       │
 * │                                                                             │
 * │  UploadStatusItem: { loading, syncTime, syncId, localModifiedTime, dirty } │
 * │  - loading: 是否正在上传                                                    │
 * │  - syncTime: 云端同步时间（成功拉取/上传后更新）                             │
 * │  - syncId: 云端数据的 MD5                                                   │
 * │  - localModifiedTime: 本地最后修改时间戳                                    │
 * │  - dirty: 本地是否有未同步的修改                                             │
 * │                                                                             │
 * │  【同步策略: 版本感知的 Last-Write-Wins】                                    │
 * │  1. syncId 相同 → 内容无变化，直接跳过                                      │
 * │  2. 本地 dirty = false → 使用版本感知合并策略                               │
 * │  3. 本地 dirty = true 且 localModifiedTime > syncTime → 上传本地配置       │
 * │  4. 本地 dirty = true 且 localModifiedTime <= syncTime → 使用版本感知合并  │
 * │                                                                             │
 * │  【版本感知合并策略】核心原则：版本较新的一方优先                            │
 * │  1. 版本相同 → 直接采用远程配置（覆盖本地）                                 │
 * │  2. 本地版本较新 → 以本地结构为模板，合并远程值，保留本地新增字段            │
 * │  3. 远程版本较新 → 以远程结构为模板，合并本地值，保留远程新增字段            │
 * │  4. 缺失版本 → 默认 '0.0.0'，按最旧版本处理                                 │
 * │                                                                             │
 * │  【时序保证 / 故障恢复】                                                    │
 * │  - 本地修改立即设置 dirty=true 和 localModifiedTime                         │
 * │  - 只有上传成功后才清除 dirty 和更新 syncTime/syncId                         │
 * │  - 上传失败保留 dirty，页面重新加载后会重试                                  │
 * │  - 应用启动时调用 handleMissedUploadConfig 处理上次未完成的上传             │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * 【典型场景验证】
 * 场景1: 新设备 v2.0.0 首次同步云端 v1.27.0 数据
 *   - 本地有新 Widget clockFlip.enabled=true（默认启用）
 *   - 云端无 clockFlip 或 enabled=false
 *   → 版本感知合并保留本地新字段的默认启用状态 ✅
 *
 * 场景2: 设备A(v2.0.0)修改后同步到设备B(v1.27.0)
 *   - 设备B 收到云端 v2.0.0 数据
 *   → 以远程为准，舍弃设备B本地的废弃字段，接纳远程新增字段 ✅
 *
 * 场景3: 两个设备同时修改，最后写入者胜
 *   - 基于时间戳比较 localModifiedTime > syncTime 则本地优先 ✅
 *
 * 【Chrome 同步配额限制应对】
 * - 单个 key: 最大 8KB，代码留 200 字节余量，超限时拦截并告警
 * - 总容量: 约 100KB，当前约 10 个配置项远低于限制
 * - 写入频率: 每分钟最多 120 次，防抖 + 频率告警防止超限
 * - 大配置压缩: keyboard 等大配置自动 gzip 压缩，大幅降低体积
 */
import md5 from 'crypto-js/md5'
import { useDebounceFn } from '@vueuse/core'
import {
  MERGE_CONFIG_DELAY,
  MERGE_CONFIG_MAX_DELAY,
} from '@/logic/constants/app'
import {
  KEYBOARD_URL_MAX_LENGTH,
  KEYBOARD_NAME_MAX_LENGTH,
} from '@/logic/keyboard/keyboard-constants'
import { defaultConfig, defaultUploadStatusItem } from '@/logic/config'
import { KEYBOARD_COMMON_CONFIG } from '@/logic/keyboard/keyboard-config'
import {
  compareLeftVersionLessThanRightVersions,
  log,
  downloadJsonByTagA,
  sleep,
} from '@/logic/util'
import {
  localConfig,
  localState,
  globalState,
  switchSettingDrawerVisible,
} from '@/logic/store'
import { mergeState } from '@/logic/config-merge'
import { handleStateResetAndUpdate, updateSetting } from '@/logic/config-update'
import { clearDatabase } from '@/logic/database'
import {
  COMPRESS_PREFIX,
  compressString,
  decompressString,
  shouldCompress,
  parseStoredData,
} from '@/logic/compress'

// ── 压缩配置 ─────────────────────────
// 压缩相关函数已移至 @/logic/compress.ts，此处仅引用

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

// chrome.storage.sync 单 key 限制（留 92 字节余量）
export const SYNC_QUOTA_BYTES_PER_ITEM = 8192
const SYNC_SIZE_WARN = 7000 // 7KB 黄色警告
const SYNC_SIZE_LIMIT = 8000 // 8KB 拦截（留有余量）

// 写入频率限制检测
const MAX_WRITE_PER_MINUTE = 120
const WRITE_RATE_WINDOW = 60000 // 1 分钟窗口
const WRITE_RATE_WARN_THRESHOLD = 80 // 80% 时警告

interface WriteRecord {
  timestamp: number
  field: ConfigField
}

const writeHistory: WriteRecord[] = []

/**
 * 检测写入频率，返回是否接近限制
 */
const checkWriteRate = (
  field: ConfigField,
): { isNearLimit: boolean; count: number } => {
  const now = Date.now()
  // 清理过期记录
  const cutoff = now - WRITE_RATE_WINDOW
  while (writeHistory.length > 0 && writeHistory[0].timestamp < cutoff) {
    writeHistory.shift()
  }
  // 添加当前记录
  writeHistory.push({ timestamp: now, field })
  const count = writeHistory.length
  const isNearLimit =
    count >= MAX_WRITE_PER_MINUTE * (WRITE_RATE_WARN_THRESHOLD / 100)
  return { isNearLimit, count }
}

const getUploadConfigData = (field: ConfigField) => {
  // 处理 keyboardBookmark 的书签配置：
  //   1. 删除空 url 条目
  //   2. 兜底截断超长 url / name（防止极端情况写爆 8KB 限制）
  if (field === 'keyboardBookmark') {
    const src = localConfig.keyboardBookmark
    const newKeymap: Record<string, { url: string; name?: string }> = {}
    for (const code of Object.keys(src.keymap)) {
      const item = src.keymap[code] as { url?: string; name?: string }
      if (!item) continue
      let url = (item.url || '').replaceAll(' ', '')
      if (url.length === 0) continue
      // 兜底截断：UI 层已限制，这里是最后防线
      if (url.length > KEYBOARD_URL_MAX_LENGTH) {
        url = url.slice(0, KEYBOARD_URL_MAX_LENGTH)
      }
      let name = (item.name || '').trim()
      if (name.length > KEYBOARD_NAME_MAX_LENGTH) {
        name = name.slice(0, KEYBOARD_NAME_MAX_LENGTH)
      }
      const next: { url: string; name?: string } = { url }
      if (name.length > 0) next.name = name
      newKeymap[code] = next
    }
    return { ...src, keymap: newKeymap }
  }
  return localConfig[field]
}

/**
 * https://developer.chrome.com/docs/extensions/reference/storage/
 *
 * Chrome Storage Sync 限制：
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 限制项                              │ 值          │ 说明                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ QUOTA_BYTES_PER_ITEM                │ 8KB         │ 单个 key 最大 8KB   │
 * │ QUOTA_BYTES                         │ 100KB       │ 总容量约 100KB      │
 * │ MAX_ITEMS                           │ 512         │ 最多 512 个 key     │
 * │ MAX_WRITE_OPERATIONS_PER_MINUTE     │ 120         │ 每分钟写入限制      │
 * │ MAX_WRITE_OPERATIONS_PER_HOUR       │ 1800        │ 每小时写入限制      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 当前项目防超限措施：
 * 1. 防抖写入：MERGE_CONFIG_DELAY = 2000ms，maxWait = 5000ms
 *    - 连续修改时最多每 2 秒触发一次写入
 *    - 最多延迟 5 秒必须写入
 * 2. MD5 去重：内容未变化时不写入
 * 3. 当前配置项数量：约 10 个（general + 各 widget），远低于 512 限制
 * 4. 压缩优化：keyboard 等大配置启用 gzip 压缩，降低单 key 大小
 *
 * 写入频率分析（最坏情况）：
 * - 用户疯狂修改设置，每个配置项 5 秒内修改一次
 * - 10 个配置项 × (60/5) = 120 次/分钟，刚好触及限制
 * - 实际场景中几乎不可能达到此频率
 */
const uploadConfigFn = async (field: ConfigField) => {
  return new Promise((resolve) => {
    // 检测写入频率
    const { isNearLimit, count } = checkWriteRate(field)
    if (isNearLimit) {
      log(
        `Upload config-${field} write rate warning`,
        `${count}/${MAX_WRITE_PER_MINUTE} per minute`,
      )
      window.$message.warning(
        window
          .$t('generalSetting.syncRateWarning')
          .replace('__count__', String(count))
          .replace('__max__', String(MAX_WRITE_PER_MINUTE)),
      )
    }

    if (!localState.value.isUploadConfigStatusMap[field]) {
      localState.value.isUploadConfigStatusMap[field] = {
        ...defaultUploadStatusItem,
      }
    }
    localState.value.isUploadConfigStatusMap[field].loading = true
    log(`Upload config-${field} start`)
    const uploadData = getUploadConfigData(field)
    const currConfigMd5 = md5(JSON.stringify(uploadData)).toString()
    const prevSyncId = localState.value.isUploadConfigStatusMap[field].syncId

    // 内容未变化时跳过上传（MD5 去重优化）
    if (prevSyncId === currConfigMd5) {
      // 内容未变化，跳过上传
      setTimeout(() => {
        localState.value.isUploadConfigStatusMap[field].loading = false
        resolve(true)
      }, 100)
      return
    }
    const currTime = Date.now()
    // ⚠️ 重要：syncTime 和 syncId 在上传成功后才更新，确保失败时保留正确的同步状态
    // 这样可以在页面刷新后通过 handleMissedUploadConfig 重试
    const payloadStr = JSON.stringify({
      syncTime: currTime,
      syncId: currConfigMd5,
      appVersion: window.appVersion,
      data: uploadData,
    })
    // 上传前校验大小，超限时告警并中止同步（保留本地数据，避免静默丢失）
    const payloadBytes = new TextEncoder().encode(payloadStr).length

    // 异步处理压缩和上传
    const doUpload = async () => {
      let finalPayload = payloadStr
      let isCompressed = false

      // 判断是否使用压缩
      if (shouldCompress(field, payloadBytes)) {
        try {
          const compressed = await compressString(payloadStr)
          finalPayload = COMPRESS_PREFIX + compressed
          isCompressed = true
          log(
            `Upload config-${field} compressed`,
            `${payloadBytes} -> ${finalPayload.length} bytes`,
          )
        } catch (e) {
          log(`Upload config-${field} compress failed, use raw`, e)
        }
      }

      // 检查压缩后大小（或原始大小）
      const finalBytes = new TextEncoder().encode(finalPayload).length
      if (finalBytes > SYNC_SIZE_LIMIT) {
        log(
          `Upload config-${field} size exceeded`,
          `${finalBytes} bytes (compressed: ${isCompressed})`,
        )
        window.$message.error(
          window
            .$t('generalSetting.syncSizeExceeded')
            .replace('__field__', field)
            .replace('__size__', `${(finalBytes / 1024).toFixed(1)}`),
        )
        localState.value.isUploadConfigStatusMap[field].loading = false
        resolve(false)
        return
      }
      if (finalBytes > SYNC_SIZE_WARN) {
        log(
          `Upload config-${field} size warning`,
          `${finalBytes} bytes (compressed: ${isCompressed})`,
        )
        window.$message.warning(
          window
            .$t('generalSetting.syncSizeWarning')
            .replace('__field__', field)
            .replace('__size__', `${(finalBytes / 1024).toFixed(1)}`),
        )
      }

      const payload = { [`naive-tab-${field}`]: finalPayload }
      chrome.storage.sync.set(payload, async () => {
        const error = chrome.runtime.lastError
        if (error) {
          // 上传失败：保留 loading 和 dirty 状态，页面刷新后重试
          log(`Upload config-${field} error`, error)
          window.$message.error(
            `${window.$t('common.upload')}${window.$t('common.setting')}${window.$t('common.fail')}`,
          )
        } else {
          // 上传成功：更新同步状态，清除 dirty 标记
          log(`Upload config-${field} complete (compressed: ${isCompressed})`)
          // 上传成功后更新本地缓存的大小（估算值，与 getBytesInUse 基本一致）
          configSizeMap[field] = finalBytes
          // 上传成功后更新同步状态
          localState.value.isUploadConfigStatusMap[field].syncTime = currTime
          localState.value.isUploadConfigStatusMap[field].syncId = currConfigMd5
          // 清除 dirty 标记
          localState.value.isUploadConfigStatusMap[field].dirty = false
        }
        setTimeout(() => {
          // 确保isUploadConfigLoading的值不会抖动，消除多个配置排队同步时中间出现的短暂值均为false的间隙
          localState.value.isUploadConfigStatusMap[field].loading = false
          resolve(true)
        }, 100)
      })
    }

    doUpload()
  })
}

const genUploadConfigDebounceFn = (field: ConfigField) => {
  return useDebounceFn(
    () => {
      uploadConfigFn(field)
    },
    MERGE_CONFIG_DELAY,
    { maxWait: MERGE_CONFIG_MAX_DELAY },
  )
}

/**
 * 生成配置变更监听函数
 *
 * 【工作流程】
 * 1. 标记 dirty=true 和 localModifiedTime（记录本地修改）
 * 2. 标记 loading=true（显示同步中状态）
 * 3. 触发防抖上传（避免频繁写入）
 */
const genWathUploadConfigFn = (field: ConfigField) => {
  const debounceFn = genUploadConfigDebounceFn(field)
  return () => {
    // 标记本地有修改
    localState.value.isUploadConfigStatusMap[field].dirty = true
    localState.value.isUploadConfigStatusMap[field].localModifiedTime =
      Date.now()
    localState.value.isUploadConfigStatusMap[field].loading = true
    log(`Upload config-${field} ready`)
    debounceFn()
  }
}

export const handleWatchLocalConfigChange = () => {
  const fieldList = Object.keys(localConfig) as ConfigField[]
  for (const field of fieldList) {
    const uploadConfigFn = genWathUploadConfigFn(field)
    watch(
      () => localConfig[field],
      () => {
        uploadConfigFn()
      },
      { deep: true },
    )
  }
}

/**
 * 强制立即同步配置到 chrome.storage.sync（跳过防抖）
 *
 * 用于 popup 等可能立即关闭的场景，确保配置能同步到 Service Worker
 * 调用后会立即写入，不依赖防抖延迟
 *
 * @param field 配置字段名，如 'keyboardBookmark'
 * @returns Promise<boolean> 同步是否成功
 */
export const flushConfigSync = async (field: ConfigField): Promise<boolean> => {
  // 安全兜底：确保 isUploadConfigStatusMap[field] 存在（popup 不会调用 handleStateResetAndUpdate）
  if (!localState.value.isUploadConfigStatusMap[field]) {
    localState.value.isUploadConfigStatusMap[field] = {
      ...defaultUploadStatusItem,
    }
  }
  // 标记本地有修改（如果尚未标记）
  if (!localState.value.isUploadConfigStatusMap[field].dirty) {
    localState.value.isUploadConfigStatusMap[field].dirty = true
    localState.value.isUploadConfigStatusMap[field].localModifiedTime =
      Date.now()
  }
  localState.value.isUploadConfigStatusMap[field].loading = true
  log(`Flush config-${field} sync`)
  const result = await uploadConfigFn(field)
  return result as boolean
}

/**
 * 设置 chrome.storage.onChanged 监听器，同步 popup 修改的 keyboardBookmark 配置
 *
 * 【使用场景】
 * popup 修改书签后通过 flushConfigSync('keyboardBookmark') 立即写入 chrome.storage.sync
 * newtab 通过此监听器实时感知变化并更新 localConfig.keyboardBookmark
 *
 * 【数据格式】
 * parseStoredData 自动处理 gzip 压缩数据（>4000 字节时启用 gzip 压缩）
 *
 * 【防循环更新】
 * 通过比较 syncId 判断是否需要更新，避免本地修改后又触发 onChanged 形成循环
 *
 * 【注意：直接赋值的副作用】
 * localConfig.keyboardBookmark = parsed.data 会触发 watchLocalConfigChange 中的 watcher，
 * 导致排队上传（debounce）。但由于 MD5 去重机制，上传时会发现 syncId 相同而跳过实际上传，
 * 因此不会造成真正的循环上传。
 *
 * 【注意】
 * 此监听器只在 newtab 页面注册，Service Worker 有自己的独立监听逻辑（background/main.ts）
 */
export const setupKeyboardSyncListener = () => {
  chrome.storage.onChanged.addListener((changes) => {
    const key = 'naive-tab-keyboardBookmark'
    if (!changes[key]) return

    const raw = changes[key].newValue as string
    if (!raw || raw.length === 0) return

    // 返回 Promise，Chrome 会等待异步完成
    return parseStoredData(raw)
      .then((parsed: SyncPayload) => {
        const newSyncId = parsed.syncId
        const currSyncId =
          localState.value.isUploadConfigStatusMap.keyboardBookmark?.syncId

        // syncId 相同说明内容未变化，跳过更新（防循环）
        if (newSyncId === currSyncId) {
          log('Sync keyboardBookmark skipped (same syncId)')
          return
        }

        // 先更新同步状态，防止后续替换对象时触发防抖上传
        // uploadConfigFn 中的 MD5 去重会检测到 syncId 相同而跳过上传
        localState.value.isUploadConfigStatusMap.keyboardBookmark.syncId =
          newSyncId
        localState.value.isUploadConfigStatusMap.keyboardBookmark.syncTime =
          parsed.syncTime
        localState.value.isUploadConfigStatusMap.keyboardBookmark.dirty = false

        // 整体替换 keyboardBookmark 配置对象
        localConfig.keyboardBookmark = parsed.data
        log('Sync keyboardBookmark updated from storage.onChanged')
      })
      .catch((e) => {
        log('Sync keyboardBookmark parse error', e)
      })
  })
}

/**
 * 页面启动时处理上次未完成上传的配置
 *
 * 【故障恢复机制】
 * 当页面在上传过程中刷新或关闭，loading 状态会保留在 localStorage 中。
 * 启动时重新触发上传，确保不会丢失用户的修改。
 *
 * 【执行时机】
 * 在 loadRemoteConfig 之后执行，确保先同步云端最新数据，再处理本地未完成的上传
 */
export const handleMissedUploadConfig = async () => {
  for (const field of Object.keys(
    localState.value.isUploadConfigStatusMap,
  ) as ConfigField[]) {
    if (localState.value.isUploadConfigStatusMap[field].loading) {
      log('Handle missed upload config', field)
      await uploadConfigFn(field)
    }
  }
}

/**
 * 页面启动时初始化配置同步
 *
 * 所有需要读写配置的页面（newtab、options）都应在 onMounted 中调用此函数。
 * 按顺序执行：初始化状态字段 → 拉取云端配置 → 重试未完成上传 → 注册变更监听 → 监听 popup 修改
 */
export const setupPageConfigSync = async () => {
  handleStateResetAndUpdate()
  await loadRemoteConfig()
  await handleMissedUploadConfig()
  handleWatchLocalConfigChange()
  setupKeyboardSyncListener()
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
      // 内容未变化则跳过，避免触发冗余上传
      if (JSON.stringify(localConfig[field]) === JSON.stringify(newConfig)) {
        return
      }
      // 深合并保留新增的默认字段
      localConfig[field] = mergeState(localConfig[field], newConfig)
    }
  })
}

// ── 版本感知合并策略 ─────────────────────────

/**
 * 版本感知的配置合并策略
 *
 * 【核心逻辑】
 * 直接复用 store.ts 中的 mergeState 函数实现版本感知合并
 * - mergeState(template, source): 以 template 为模板，只保留 template 中定义的字段
 *
 * 【版本比较规则】
 * 1. 版本相同 → 直接采用远程配置（覆盖本地）
 * 2. 本地版本较新 → 以本地为模板，合并远程值，保留本地新增字段
 * 3. 远程版本较新 → 以远程为模板，合并本地值，保留远程新增字段
 * 4. 缺失版本 → 默认 '0.0.0'，按最旧版本处理
 *
 * 【设计原理】
 * 版本较新的一方代表更新的数据结构，应以其为模板进行合并，这样可以：
 * - 保留新版本新增的字段及其默认值
 * - 自动丢弃旧版本的废弃字段
 * - 继承对方已有的用户配置值
 *
 * @param localData 本地配置数据
 * @param remoteData 远程配置数据
 * @param localVersion 本地版本
 * @param remoteVersion 远程版本
 * @returns 合并后的配置数据
 */
export const mergeConfigWithVersionAwareness = (
  localData: Record<string, any>,
  remoteData: Record<string, any>,
  localVersion: string,
  remoteVersion: string,
): Record<string, any> => {
  // 版本相同，直接采用远程配置
  if (localVersion === remoteVersion) {
    log(`Merge config: same version ${localVersion}, use remote`)
    return remoteData
  }

  // 比较版本，以较新版本为模板进行合并
  const isLocalNewer = compareLeftVersionLessThanRightVersions(
    remoteVersion,
    localVersion,
  )

  if (isLocalNewer) {
    // 本地版本较新：以本地为模板，保留本地新字段
    log(`Merge config: local ${localVersion} newer, local as template`)
    return mergeState(localData, remoteData) as Record<string, any>
  } else {
    // 远程版本较新：以远程为模板，保留远程新字段
    log(`Merge config: remote ${remoteVersion} newer, remote as template`)
    return mergeState(remoteData, localData) as Record<string, any>
  }
}

/**
 * 载入远程配置信息
 * chrome.storage 格式示例：
 * {
 *   `naive-tab-${field}`: '{
 *      syncTime: number
 *      syncId: md5
 *      appVersion: string
 *      data: typeof defaultConfig[ConfigField]
 *   }'
 * }
 *
 * 【数据结构迁移说明】
 * 云端配置接收后通过 updateSetting -> mergeState 处理，以 defaultConfig 为模板自动补充新字段。
 * 本地应用升级时的迁移逻辑见 store.ts 中的 handleAppUpdate。
 *
 * 【同步流程决策树】
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ 1. 云端无该字段                                                            │
 * │    └→ 上传本地默认配置（初始化云端）                                       │
 * │                                                                            │
 * │ 2. syncId 相同                                                             │
 * │    └→ 跳过（内容完全一致，无需更新）                                       │
 * │                                                                            │
 * │ 3. 本地无修改 (dirty=false)                                                │
 * │    └→ 版本感知合并（信任云端，以版本较新方为模板）                         │
 * │                                                                            │
 * │ 4. 本地有修改 (dirty=true) 且 localModifiedTime > syncTime                 │
 * │    └→ 上传本地配置（本地修改更新，本地优先）                               │
 * │                                                                            │
 * │ 5. 本地有修改 (dirty=true) 且 localModifiedTime <= syncTime                │
 * │    └→ 版本感知合并（云端修改更新，但需考虑版本差异）                       │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * 【时序保证】
 * - dirty 标记：本地配置修改时立即设置，上传成功后清除
 * - localModifiedTime：记录本地最后修改时间，用于冲突检测
 * - syncTime/syncId：上传/下载成功后更新，标记云端同步状态
 *
 * 【故障恢复】
 * - 上传失败：保留 dirty=true，页面重新加载后 handleMissedUploadConfig 重试
 * - 解析失败：尝试兼容旧格式，仍失败则跳过该字段
 */
export const loadRemoteConfig = () => {
  log('Load config start')
  return new Promise((resolve) => {
    console.time('loadRemoteConfig')
    chrome.storage.sync.get(null, async (data) => {
      const error = chrome.runtime.lastError
      if (error) {
        log('Load config error', error)
        window.$message.error(
          `${window.$t('common.sync')}${window.$t('common.setting')}${window.$t('common.fail')}`,
        )
        resolve(false)
        console.timeEnd('loadRemoteConfig')
        return
      }
      try {
        const pendingConfig = {} as typeof defaultConfig
        const uploadPromises: Promise<unknown>[] = []
        for (const field of Object.keys(defaultConfig) as ConfigField[]) {
          if (
            !Object.prototype.hasOwnProperty.call(data, `naive-tab-${field}`)
          ) {
            // 云端无该字段，上传本地配置进行初始化
            log(`Config-${field} initialize`)
            uploadPromises.push(uploadConfigFn(field))
          } else {
            const rawData = data[`naive-tab-${field}`] as string
            let target: SyncPayload

            try {
              // 使用 parseStoredData 自动处理压缩和非压缩格式
              target = await parseStoredData(rawData)
            } catch (parseError) {
              log(`Config-${field} parse error`, parseError)
              // 解析失败，尝试直接 JSON.parse（兼容旧格式）
              try {
                target = JSON.parse(rawData)
              } catch (e) {
                log(`Config-${field} legacy parse error, skip`, e)
                continue
              }
            }

            // console.log(`naive-tab-config-${field}`, target)
            const targetConfig = target.data
            const targetSyncTime = target.syncTime
            const targetSyncId = target.syncId
            // 兼容旧数据：缺失 appVersion 时默认 '0.0.0'，按最旧版本处理
            const targetAppVersion = target.appVersion || '0.0.0'
            const localSyncId =
              localState.value.isUploadConfigStatusMap[field].syncId
            chrome.storage.sync
              .getBytesInUse(`naive-tab-${field}`)
              .then((bytesInUse) => {
                configSizeMap[field] = bytesInUse
              })

            // syncId(md5)一致时无需更新
            if (targetSyncId === localSyncId) {
              log(`Config-${field} no update`)
              continue
            }

            // ====== 冲突检测逻辑 (版本感知的 Last-Write-Wins) ======
            // 判断优先级的条件：
            // 1. syncId 相同 → 内容完全一致，跳过
            // 2. 本地无修改 (dirty=false) → 使用版本感知合并策略
            // 3. 本地有修改，且本地修改时间 > 云端同步时间 → 上传本地
            // 4. 本地有修改，但云端更新 → 使用版本感知合并策略
            const localDirty =
              localState.value.isUploadConfigStatusMap[field].dirty
            const localModifiedTime =
              localState.value.isUploadConfigStatusMap[field].localModifiedTime

            if (!localDirty) {
              // 场景2：本地无修改，使用版本感知合并策略
              // 说明：本地未修改，信任云端数据，但仍需考虑版本差异
              log(
                `Config-${field} merge (local clean): local v${window.appVersion} vs remote v${targetAppVersion}`,
              )
              const mergedConfig = mergeConfigWithVersionAwareness(
                localConfig[field] as Record<string, any>,
                targetConfig as Record<string, any>,
                window.appVersion,
                targetAppVersion,
              )
              pendingConfig[field] = mergedConfig as any
              localState.value.isUploadConfigStatusMap[field].syncTime =
                targetSyncTime
              localState.value.isUploadConfigStatusMap[field].syncId =
                targetSyncId
            } else if (localModifiedTime > targetSyncTime) {
              // 场景3：本地修改更新，上传本地配置
              // 说明：本地最后修改时间晚于云端同步时间，本地优先
              log(
                `Config-${field} upload local (local newer: ${localModifiedTime} > ${targetSyncTime})`,
              )
              uploadPromises.push(uploadConfigFn(field))
            } else {
              // 场景4：云端修改更新，使用版本感知合并策略
              // 说明：云端更新，但需考虑版本差异，以较新版本为模板合并
              log(
                `Config-${field} merge (remote newer: ${targetSyncTime} >= ${localModifiedTime}): local v${window.appVersion} vs remote v${targetAppVersion}`,
              )
              const mergedConfig = mergeConfigWithVersionAwareness(
                localConfig[field] as Record<string, any>,
                targetConfig as Record<string, any>,
                window.appVersion,
                targetAppVersion,
              )
              pendingConfig[field] = mergedConfig as any
              // 合并后清除 dirty 标记，因为已与云端同步
              localState.value.isUploadConfigStatusMap[field].dirty = false
              localState.value.isUploadConfigStatusMap[field].syncTime =
                targetSyncTime
              localState.value.isUploadConfigStatusMap[field].syncId =
                targetSyncId
            }
          }
        }
        console.timeEnd('loadRemoteConfig')
        // 等待所有初始化上传完成
        if (uploadPromises.length > 0) {
          await Promise.allSettled(uploadPromises)
        }
        if (Object.keys(pendingConfig).length === 0) {
          resolve(true)
          return
        }
        log('Load config done', pendingConfig)
        await updateSetting(pendingConfig)
        resolve(true)
      } catch (e) {
        log('Process remote config error', e)
        window.$message.error(
          `${window.$t('common.process')}${window.$t('common.setting')}${window.$t('common.fail')}`,
        )
        console.timeEnd('loadRemoteConfig')
        resolve(false)
      }
    })
  })
}

const clearStorage = (clearAll = false) => {
  window.$notification.info({
    title: window.$t('generalSetting.clearStorageLabel'),
    content: window.$t('prompts.pleaseWait'),
  })
  return new Promise((resolve) => {
    const cancelListenerSync = watch(isUploadConfigLoading, async (value) => {
      if (value) {
        log('Clear localStorage wait') // 等待config同步完成、localStorage写入完成后再进行后续操作
        return
      }
      await sleep(1000) // 严格确保配置上传完成后再执行清除动作
      log('Clear localStorage execute')
      cancelListenerSync()
      localStorage.clear()
      if (!clearAll) {
        localStorage.setItem('data-first', 'false') // 避免打开help弹窗
      }
      resolve(true)
      log('Reload page')
      location.reload()
    })
  })
}

export const refreshSetting = async () => {
  globalState.isClearStorageLoading = true
  await updateSetting()
  await clearStorage()
  globalState.isClearStorageLoading = false
}

export const importSetting = async (text: string) => {
  if (!text) {
    return
  }
  globalState.isImportSettingLoading = true
  let fileContent = null as typeof defaultConfig | null
  try {
    fileContent = JSON.parse(text)
  } catch (e) {
    log('Parse error', e)
    window.$message.error(
      `${window.$t('common.import')}${window.$t('common.fail')}`,
    )
    globalState.isImportSettingLoading = false
    return
  }
  if (
    !fileContent ||
    Object.keys(fileContent).length === 0 ||
    !fileContent?.general?.version
  ) {
    globalState.isImportSettingLoading = false
    return
  }
  log('FileContent', fileContent)
  try {
    // ── 旧数据结构兼容，统一转为最新 key ──
    // bookmark → keyboardBookmark（v1.27.0 前）
    if ((fileContent as any).bookmark) {
      fileContent.keyboardBookmark = (fileContent as any).bookmark
      delete (fileContent as any).bookmark
    }
    // keyboard → keyboardBookmark（code 重命名）
    if ((fileContent as any).keyboard && !fileContent.keyboardBookmark) {
      fileContent.keyboardBookmark = structuredClone(
        (fileContent as any).keyboard,
      )
      delete (fileContent as any).keyboard
    }
    // commandShortcut → keyboardCommand（code 重命名）
    if ((fileContent as any).commandShortcut && !fileContent.keyboardCommand) {
      fileContent.keyboardCommand = structuredClone(
        (fileContent as any).commandShortcut,
      )
      delete (fileContent as any).commandShortcut
    }
    // keyboardBookmark 外观字段拆分到 keyboardCommon
    if (fileContent.keyboardBookmark && !fileContent.keyboardCommon) {
      fileContent.keyboardCommon = structuredClone(KEYBOARD_COMMON_CONFIG)
      const appearanceFields = Object.keys(KEYBOARD_COMMON_CONFIG)
      for (const field of appearanceFields) {
        if ((fileContent.keyboardBookmark as any)[field] !== undefined) {
          ;(fileContent.keyboardCommon as any)[field] = (
            fileContent.keyboardBookmark as any
          )[field]
        }
      }
      for (const field of appearanceFields) {
        delete (fileContent.keyboardBookmark as any)[field]
      }
    }
    // focusVisibleWidgetMap key 重命名
    const fvm = (fileContent as any).general?.focusVisibleWidgetMap
    if (fvm) {
      if (fvm.keyboard !== undefined && fvm.keyboardBookmark === undefined) {
        fvm.keyboardBookmark = fvm.keyboard
        delete fvm.keyboard
      }
      if (
        fvm.commandShortcut !== undefined &&
        fvm.keyboardCommand === undefined
      ) {
        fvm.keyboardCommand = fvm.commandShortcut
        delete fvm.commandShortcut
      }
    }
    // openPageFocusElement 修正
    if ((fileContent as any).general?.openPageFocusElement === 'keyboard') {
      fileContent.general.openPageFocusElement = 'keyboardBookmark'
    }

    // isFocusMode 从 general 迁移到 localState
    if ((fileContent.general as any)?.isFocusMode !== undefined) {
      localState.value.isFocusMode = (fileContent.general as any).isFocusMode
      delete (fileContent.general as any).isFocusMode
    }

    log('FileContentTransform', fileContent)
    fileContent.general.version = window.appVersion // 更新版本号
    await updateSetting(fileContent)
    window.$message.success(
      `${window.$t('common.import')}${window.$t('common.success')}`,
    )
    globalState.isImportSettingLoading = false
    switchSettingDrawerVisible(false)
  } catch (e) {
    log('Import error', e)
    window.$message.error(
      `${window.$t('common.import')}${window.$t('common.fail')} ${e}`,
    )
    globalState.isImportSettingLoading = false
  }
}

export const exportSetting = () => {
  const filename = `naivetab-v${window.appVersion}-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadJsonByTagA(localConfig, filename)
  window.$message.success(
    `${window.$t('common.export')}${window.$t('common.success')}`,
  )
}

/**
 * 轻量级拉取云端 keyboardBookmark 配置（仅供 popup 等短生命周期上下文使用）
 *
 * 与 loadRemoteConfig 的区别：
 * - 只在读取 keyboardBookmark 一个字段，不遍历所有 defaultConfig
 * - 不触发 uploadConfigFn，不产生任何写入
 * - 不调用 updateSetting，不触发全局配置更新
 * - 只在云端 syncId 与本地不同时才替换 localConfig.keyboardBookmark
 *
 * chrome.storage.sync.get 读的是本地缓存的同步数据，不依赖实时网络。
 */
export const loadRemoteKeyboardConfig = async () => {
  try {
    const data = await chrome.storage.sync.get('naive-tab-keyboardBookmark')
    const raw = data['naive-tab-keyboardBookmark'] as string
    if (!raw || raw.length === 0) {
      log('Load remote keyboardBookmark config: empty')
      return false
    }

    const parsed = await parseStoredData(raw)
    const newSyncId = parsed.syncId
    const currSyncId =
      localState.value.isUploadConfigStatusMap.keyboardBookmark?.syncId

    // syncId 相同说明本地已是最新，跳过
    if (newSyncId === currSyncId) {
      log('Load remote keyboardBookmark config: same syncId, skip')
      return false
    }

    // 更新同步状态并替换配置
    if (!localState.value.isUploadConfigStatusMap.keyboardBookmark) {
      localState.value.isUploadConfigStatusMap.keyboardBookmark = {
        ...defaultUploadStatusItem,
      }
    }
    localState.value.isUploadConfigStatusMap.keyboardBookmark.syncId = newSyncId
    localState.value.isUploadConfigStatusMap.keyboardBookmark.syncTime =
      parsed.syncTime
    localState.value.isUploadConfigStatusMap.keyboardBookmark.dirty = false
    localConfig.keyboardBookmark = parsed.data

    log('Load remote keyboardBookmark config: updated from cloud')
    return true
  } catch (e) {
    log('Load remote keyboardBookmark config error', e)
    return false
  }
}

export const resetSetting = async () => {
  chrome.storage.sync.clear()
  localStorage.clear()
  await clearDatabase()
  location.reload()
}

export const requestPermission = (field: OptionsPermission) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.permissions.request({ permissions: [field] }, (granted) => {
        resolve(granted)
      })
    } catch (e) {
      reject(e)
    }
  })
}
