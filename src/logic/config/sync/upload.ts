/**
 * @module upload
 * @description 配置上传引擎 — 防抖写入、MD5 去重、Gzip 压缩、写入频率检测。
 * @dependencies config/defaults.ts（defaultUploadStatusItem）、config/compress.ts（压缩）、constants/app.ts（防抖延迟）
 * @consumers config/sync/loader.ts（拉取时触发上传）、config/sync/state.ts（setupKeyboardSyncListener 监听）、config/sync/manage.ts（导入导出）
 * @pitfalls
 *   - checkWriteRate 有滑动窗口限制（120 次/分钟），超过阈值会弹警告但不会拒绝写入
 *   - flushConfigSync 是 popup 关闭前必须调用的强制同步，否则防抖回调不会执行（popup 销毁后 watch 失效）
 *   - handleMissedUploadConfig 在页面启动时调用，补救那些 loading=true 但未完成的上传
 *   - genWatchUploadConfigFn 中先标记 dirty+localModifiedTime，再调用防抖函数，顺序不能反
 * @see docs/architecture/storage.md#防抖写入机制
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
import { defaultUploadStatusItem } from '@/logic/config/defaults'
import { log } from '@/logic/utils/common'
import { localConfig, localState } from '@/logic/config/state'
import {
  COMPRESS_PREFIX,
  compressString,
  shouldCompress,
} from '@/logic/config/compress'
import { showToast } from '@/common/toast'
import { configSizeMap } from './state'

export const SYNC_QUOTA_BYTES_PER_ITEM = 8192
const SYNC_SIZE_WARN = 7000
const SYNC_SIZE_LIMIT = 8000

const MAX_WRITE_PER_MINUTE = 120
const WRITE_RATE_WINDOW = 60000
const WRITE_RATE_WARN_THRESHOLD = 80

interface WriteRecord {
  timestamp: number
  field: ConfigField
}

const writeHistory: WriteRecord[] = []

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

export const uploadConfigFn = async (field: ConfigField) => {
  return new Promise((resolve) => {
    const { isNearLimit, count } = checkWriteRate(field)
    if (isNearLimit) {
      log(
        `Upload config-${field} write rate warning`,
        `${count}/${MAX_WRITE_PER_MINUTE} per minute`,
      )
      showToast.warning(
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
        showToast.error(
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
        showToast.warning(
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
          showToast.error(
            `${window.$t('common.upload')}${window.$t('common.setting')}${window.$t('common.fail')}`,
          )
        } else {
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

const genWatchUploadConfigFn = (field: ConfigField) => {
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
    const uploadConfigFnLocal = genWatchUploadConfigFn(field)
    watch(
      () => localConfig[field],
      () => {
        uploadConfigFnLocal()
      },
      { deep: true },
    )
  }
}

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
