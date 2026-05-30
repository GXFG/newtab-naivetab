/**
 * @module upload
 * @description 配置上传引擎 — 防抖写入、MD5 去重、Gzip 压缩、写入频率检测。
 * @dependencies config/defaults.ts（defaultUploadStatusItem）、config/compress.ts（压缩）、constants/app.ts（防抖延迟）
 * @consumers config/sync/loader.ts（拉取时触发上传）、config/sync/state.ts（setupKeyboardSyncListener 监听）、config/sync/manage.ts（导入导出）
 * @pitfalls
 *   - checkWriteRate 必须在 MD5 去重、大小检查之后、chrome.storage.sync.set 之前调用，
 *     否则被拦截的调用会虚增计数器、触发假警告
 *   - checkWriteRate 有滑动窗口限制（120 次/分钟），超过阈值会弹警告但不会拒绝写入
 *   - flushConfigSync 是 popup 关闭前必须调用的强制同步，否则防抖回调不会执行（popup 销毁后 watch 失效）
 *   - handleMissedUploadConfig 在页面启动时调用，补救那些 loading=true 但未完成的上传
 *   - genWatchUploadConfigFn 中先标记 dirty+localModifiedTime，再调用防抖函数，顺序不能反
 *   - pendingWrites 是预期写入注册表，chrome.storage.sync.set 调用前 add，回调后 delete。
 *     state.ts 的 onChanged 先检查 pendingWrites 再走 syncId 守卫，从架构上消除时序依赖
 *   - getUploadConfigData 对 keyboardBookmark 的 keymap 做过滤裁剪，计算 MD5 时必须
 *     使用此函数而非直接 JSON.stringify(localConfig)，否则 MD5 去重会失效
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
import { gaProxy } from '@/logic/utils/gtag'
import { localConfig, localState } from '@/logic/config/state'
import {
  COMPRESS_PREFIX,
  compressString,
  shouldCompress,
} from '@/logic/config/compress'
import { showToast } from '@/common/toast'
import { configSizeMap } from './state'
import { addPendingWrite, removePendingWrite } from './pending-writes'

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

// writeHistory 跨字段共享是有意设计：Chrome 的 MAX_WRITE_OPERATIONS_PER_MINUTE
// 限制作用于 chrome.storage.sync 的所有写入操作总和，而非按字段独立计算。
// checkWriteRate 仅在即将执行 chrome.storage.sync.set 时调用（MD5 去重、大小
// 检查之后），因此虚增已被消除。启动阶段 handleMissedUploadConfig 补救上传通常
// 不超过 10 次，远低于 80% 警告阈值（96/120）。
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

export const getUploadConfigData = (field: ConfigField) => {
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
    if (!localState.value.isUploadConfigStatusMap[field]) {
      localState.value.isUploadConfigStatusMap[field] = {
        ...defaultUploadStatusItem,
      }
    }
    const status = localState.value.isUploadConfigStatusMap[field]
    status.loading = true
    status.syncStatus = 'syncing'
    log(`Upload config-${field} start`)
    const uploadData = getUploadConfigData(field)
    const currConfigMd5 = md5(JSON.stringify(uploadData)).toString()
    const prevSyncId = status.syncId

    // MD5 去重：内容未变则跳过，不记录到 writeHistory（Chrome 限制的是实际 set 调用次数）
    // 注意：loading 已在第 109 行设为 true，此处延迟 100ms 重置是为了与成功/失败分支
    // 保持一致的 UI 节奏。如果页面在此窗口内刷新，handleMissedUploadConfig 会补救
    // loading=true 的字段，但再次进入 uploadConfigFn 时仍会被 MD5 去重拦截（resolve(true)），
    // retryCount 不会增加（只在 chrome.storage.sync.set 回调报错时递增，第 208 行），
    // 因此不会产生多余网络请求或消耗重试配额。
    //
    // dirty=true 但 MD5 相同：说明数据实际已同步，只是 syncId 与本地数据不一致
    // （如 loadRemoteConfig 修复了错误的 syncId，或 handleAppUpdate → updateSetting
    // 触发 watch 置 dirty 但数据未变）。同时清除 dirty 避免 handleMissedUploadConfig
    // 每页加载都触发无效重试。
    //
    // 另一种触发场景：syncConfigFromOnChange（Popup onChanged）覆盖 Newtab 本地修改后，
    // deep watcher 重新置 dirty=true，但数据 MD5 与 Popup syncId 一致。详见 state.ts
    // syncConfigFromOnChange 注释。
    if (prevSyncId === currConfigMd5) {
      setTimeout(() => {
        status.loading = false
        status.dirty = false
        status.syncStatus = 'idle'
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

      if (shouldCompress(field, payloadBytes)) {
        try {
          const compressed = await compressString(payloadStr)
          finalPayload = COMPRESS_PREFIX + compressed
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
        status.loading = false
        status.syncStatus = 'quota-exceeded'
        status.retryCount++
        status.lastError = `size:${finalBytes}`
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

      // 所有检查通过，即将执行 chrome.storage.sync.set，此时才记录到写入速率计数器。
      // 避免 MD5 去重、大小超限等未实际写入的场景虚增计数器、触发假警告。
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

      // 在 set 调用前注册预期写入，onChanged 命中 pendingWrites 则跳过。
      // 不依赖 syncId 的回调时序，从架构上消除竞态根因。
      addPendingWrite(currConfigMd5)
      status.syncId = currConfigMd5
      status.syncTime = currTime

      const payload = { [`naive-tab-${field}`]: finalPayload }
      chrome.storage.sync.set(payload, () => {
        removePendingWrite(currConfigMd5)
        const error = chrome.runtime.lastError
        if (error) {
          log(`Upload config-${field} error`, error)
          showToast.error(
            `${window.$t('common.upload')}${window.$t('common.setting')}${window.$t('common.fail')}`,
          )
          gaProxy('click', ['sync', 'upload'], { field, result: 'failed' })
          // 上传失败返回 false，调用方（如 flushConfigSync → BaseNaiveBookmarkManager）
          // 依赖此返回值区分成功/失败。
          status.loading = false
          status.syncStatus = 'failed'
          status.retryCount++
          status.lastError = error.message || 'unknown'
          setTimeout(() => resolve(false), 100)
        } else {
          log(`Upload config-${field} done`)
          configSizeMap[field] = finalBytes
          status.dirty = false
          status.retryCount = 0
          status.lastError = ''
          status.syncStatus = 'success'
          gaProxy('click', ['sync', 'upload'], { field, result: 'success' })
          setTimeout(() => {
            status.loading = false
            status.syncStatus = 'idle'
            resolve(true)
          }, 100)
        }
      })
    }

    doUpload()
  })
}

const genUploadConfigDebounceFn = (field: ConfigField) => {
  // 捕获创建时的 generation，用于检测 cancelAllDebounce
  const capturedGen = getDebounceGeneration()
  return useDebounceFn(
    () => {
      if (getDebounceGeneration() !== capturedGen) {
        log(`Upload config-${field} skipped (debounce cancelled)`)
        // 重置 loading 状态，防止 clearStorage 中 watch(isUploadConfigLoading)
        // 永远等待。只重置非上传中状态的字段（syncStatus==='syncing' 说明
        // chrome.storage.sync.set 已在执行中，不能重置）。
        for (const f of Object.keys(
          localState.value.isUploadConfigStatusMap,
        ) as ConfigField[]) {
          const s = localState.value.isUploadConfigStatusMap[f]
          if (s.loading && s.syncStatus !== 'syncing') {
            s.loading = false
          }
        }
        return
      }
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
    // 用户主动修改时重置重试计数，给新数据全新的重试配额。
    // 不重置会导致：retryCount≥3 时 handleMissedUploadConfig 拒绝重试，
    // 用户修改可能永远无法在下次启动时被补救上传。
    localState.value.isUploadConfigStatusMap[field].retryCount = 0
    log(`Upload config-${field} ready`)
    debounceFn()
  }
}

export const handleWatchLocalConfigChange = () => {
  // 注意：这些 watch 从未返回清理函数。当前只在 newtab/options 的 onMounted 中
  // 调用一次（每个页面上下文独立），不会累积。如果未来新增动态调用场景，需要
  // 返回 watch 句柄并在组件 unmount 时清理。
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
  // 注意：此函数不会取消 handleWatchLocalConfigChange 中已排队的防抖调用。
  // 但 uploadConfigFn 内部的 MD5 去重（第 116 行）会在防抖回调执行时检查
  // prevSyncId === currConfigMd5，数据未变则提前返回，不会产生重复上传。
  // 极端场景：如果 flushConfigSync 和防抖执行之间数据又变化了，防抖会执行一次
  // 新的上传。这是预期行为，因为数据确实更新了。
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
    const status = localState.value.isUploadConfigStatusMap[field]
    // 补救场景1：上次页面生命周期中已启动但未完成的上传（loading=true）
    // 补救场景2：上次上传失败后 dirty=true 且未达重试上限的字段
    if (status.loading || (status.dirty && status.retryCount < 3)) {
      log(
        'Handle missed upload config',
        field,
        `retryCount=${status.retryCount}`,
      )
      await uploadConfigFn(field)
    }
  }
}

// ── 防抖取消机制（clearStorage 需要取消排队的防抖上传） ──

// useDebounceFn 不暴露 timer ID，所以用 generation 计数器实现：
// cancelAllDebounce 时递增 generation，防抖回调检测到 generation 变化则跳过执行。
let debounceGeneration = 0

/** 取消所有排队的防抖上传，防止 clearStorage 后上传脏数据 */
export const cancelAllDebounce = () => {
  debounceGeneration++
  log('Cancel all pending debounce timers')
}

/** 获取当前防抖 generation，由 genWatchUploadConfigFn 捕获到闭包中 */
const getDebounceGeneration = () => debounceGeneration
