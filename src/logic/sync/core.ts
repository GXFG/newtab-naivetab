/**
 * 同步引擎核心
 *
 * 负责配置上传到 chrome.storage.sync、从云端拉取合并、版本感知冲突解决、故障恢复。
 *
 * Chrome Storage Sync 限制：
 * - QUOTA_BYTES_PER_ITEM: 8KB（单个 key 最大）
 * - QUOTA_BYTES: ~100KB（总容量）
 * - MAX_WRITE_OPERATIONS_PER_MINUTE: 120
 *
 * 防超限措施：
 * 1. 防抖写入 2000ms，maxWait 5000ms
 * 2. MD5 去重：内容未变化时不写入
 * 3. keyboardBookmark 等大配置自动 gzip 压缩
 * 4. 写入频率检测 + 告警
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
import { defaultConfig, defaultUploadStatusItem } from '@/logic/config/defaults'
import { log, compareLeftVersionLessThanRightVersions } from '@/logic/util'
import { localConfig, localState } from '@/logic/store'
import { mergeState } from '@/logic/config/merge'
import { handleStateResetAndUpdate, updateSetting } from '@/logic/config/update'
import {
  COMPRESS_PREFIX,
  compressString,
  shouldCompress,
  parseStoredData,
} from '@/logic/compress'
import { configSizeMap, setupKeyboardSyncListener } from './state'

// chrome.storage.sync 单 key 限制（留 92 字节余量）
export const SYNC_QUOTA_BYTES_PER_ITEM = 8192
const SYNC_SIZE_WARN = 7000
const SYNC_SIZE_LIMIT = 8000

// 写入频率限制检测
const MAX_WRITE_PER_MINUTE = 120
const WRITE_RATE_WINDOW = 60000
const WRITE_RATE_WARN_THRESHOLD = 80

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
  const cutoff = now - WRITE_RATE_WINDOW
  while (writeHistory.length > 0 && writeHistory[0].timestamp < cutoff) {
    writeHistory.shift()
  }
  writeHistory.push({ timestamp: now, field })
  const count = writeHistory.length
  const isNearLimit =
    count >= MAX_WRITE_PER_MINUTE * (WRITE_RATE_WARN_THRESHOLD / 100)
  return { isNearLimit, count }
}

const getUploadConfigData = (field: ConfigField) => {
  if (field === 'keyboardBookmark') {
    const src = localConfig.keyboardBookmark
    const newKeymap: Record<string, { url: string; name?: string }> = {}
    for (const code of Object.keys(src.keymap)) {
      const item = src.keymap[code] as { url?: string; name?: string }
      if (!item) continue
      let url = (item.url || '').replaceAll(' ', '')
      if (url.length === 0) continue
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

const uploadConfigFn = async (field: ConfigField) => {
  return new Promise((resolve) => {
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

    if (prevSyncId === currConfigMd5) {
      setTimeout(() => {
        localState.value.isUploadConfigStatusMap[field].loading = false
        resolve(true)
      }, 100)
      return
    }
    const currTime = Date.now()
    const payloadStr = JSON.stringify({
      syncTime: currTime,
      syncId: currConfigMd5,
      appVersion: window.appVersion,
      data: uploadData,
    })
    const payloadBytes = new TextEncoder().encode(payloadStr).length

    const doUpload = async () => {
      let finalPayload = payloadStr
      let isCompressed = false

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
          log(`Upload config-${field} error`, error)
          window.$message.error(
            `${window.$t('common.upload')}${window.$t('common.setting')}${window.$t('common.fail')}`,
          )
        } else {
          log(`Upload config-${field} complete (compressed: ${isCompressed})`)
          configSizeMap[field] = finalBytes
          localState.value.isUploadConfigStatusMap[field].syncTime = currTime
          localState.value.isUploadConfigStatusMap[field].syncId = currConfigMd5
          localState.value.isUploadConfigStatusMap[field].dirty = false
        }
        setTimeout(() => {
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

const genWathUploadConfigFn = (field: ConfigField) => {
  const debounceFn = genUploadConfigDebounceFn(field)
  return () => {
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
    const uploadConfigFnLocal = genWathUploadConfigFn(field)
    watch(
      () => localConfig[field],
      () => {
        uploadConfigFnLocal()
      },
      { deep: true },
    )
  }
}

/**
 * 强制立即同步配置到 chrome.storage.sync（跳过防抖）
 * 用于 popup 等可能立即关闭的场景
 */
export const flushConfigSync = async (field: ConfigField): Promise<boolean> => {
  if (!localState.value.isUploadConfigStatusMap[field]) {
    localState.value.isUploadConfigStatusMap[field] = {
      ...defaultUploadStatusItem,
    }
  }
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
 * 页面启动时处理上次未完成上传的配置
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
 * 版本感知的配置合并策略
 *
 * 核心逻辑：版本较新的一方代表更新的数据结构，应以其为模板进行合并。
 * - 版本相同 → 直接采用远程配置
 * - 本地版本较新 → 以本地为模板，合并远程值，保留本地新增字段
 * - 远程版本较新 → 以远程为模板，合并本地值，保留远程新增字段
 * - 缺失版本 → 默认 '0.0.0'，按最旧版本处理
 */
export const mergeConfigWithVersionAwareness = (
  localData: Record<string, any>,
  remoteData: Record<string, any>,
  localVersion: string,
  remoteVersion: string,
): Record<string, any> => {
  if (localVersion === remoteVersion) {
    log(`Merge config: same version ${localVersion}, use remote`)
    return remoteData
  }

  const isLocalNewer = compareLeftVersionLessThanRightVersions(
    remoteVersion,
    localVersion,
  )

  if (isLocalNewer) {
    log(`Merge config: local ${localVersion} newer, local as template`)
    return mergeState(localData, remoteData) as Record<string, any>
  } else {
    log(`Merge config: remote ${remoteVersion} newer, remote as template`)
    return mergeState(remoteData, localData) as Record<string, any>
  }
}

/**
 * 载入远程配置
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
            log(`Config-${field} initialize`)
            uploadPromises.push(uploadConfigFn(field))
          } else {
            const rawData = data[`naive-tab-${field}`] as string
            let target: SyncPayload

            try {
              target = await parseStoredData(rawData)
            } catch (parseError) {
              log(`Config-${field} parse error`, parseError)
              try {
                target = JSON.parse(rawData)
              } catch (e) {
                log(`Config-${field} legacy parse error, skip`, e)
                continue
              }
            }

            const targetConfig = target.data
            const targetSyncTime = target.syncTime
            const targetSyncId = target.syncId
            const targetAppVersion = target.appVersion || '0.0.0'
            const localSyncId =
              localState.value.isUploadConfigStatusMap[field].syncId
            chrome.storage.sync
              .getBytesInUse(`naive-tab-${field}`)
              .then((bytesInUse) => {
                configSizeMap[field] = bytesInUse
              })

            if (targetSyncId === localSyncId) {
              log(`Config-${field} no update`)
              continue
            }

            const localDirty =
              localState.value.isUploadConfigStatusMap[field].dirty
            const localModifiedTime =
              localState.value.isUploadConfigStatusMap[field].localModifiedTime

            if (!localDirty) {
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
              log(
                `Config-${field} upload local (local newer: ${localModifiedTime} > ${targetSyncTime})`,
              )
              uploadPromises.push(uploadConfigFn(field))
            } else {
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
              localState.value.isUploadConfigStatusMap[field].dirty = false
              localState.value.isUploadConfigStatusMap[field].syncTime =
                targetSyncTime
              localState.value.isUploadConfigStatusMap[field].syncId =
                targetSyncId
            }
          }
        }
        console.timeEnd('loadRemoteConfig')
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

/**
 * 轻量级拉取云端 keyboardBookmark 配置（仅供 popup 等短生命周期上下文使用）
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

    if (newSyncId === currSyncId) {
      log('Load remote keyboardBookmark config: same syncId, skip')
      return false
    }

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

/**
 * 页面启动时初始化配置同步
 *
 * 按顺序执行：初始化状态字段 → 拉取云端配置 → 重试未完成上传 → 注册变更监听 → 监听 popup 修改
 */
export const setupPageConfigSync = async () => {
  handleStateResetAndUpdate()
  await loadRemoteConfig()
  await handleMissedUploadConfig()
  handleWatchLocalConfigChange()
  setupKeyboardSyncListener()
}
