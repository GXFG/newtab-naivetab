/**
 * @module loader
 * @description 配置拉取与合并 — 从 chrome.storage.sync 下载、版本感知合并、页面初始化。
 * @dependencies config/merge.ts（mergeState）、config/compress.ts（parseStoredData）、config/update.ts（updateSetting）
 * @consumers config/sync/state.ts（setupPageConfigSync）、popup/Setting 面板（手动同步）
 * @pitfalls
 *   - mergeConfigWithVersionAwareness 比较版本号决定以哪边为模板，版本相同直接使用远程数据
 *   - loadRemoteKeyboardConfig 是轻量版拉取，只同步 keyboardBookmark 字段，不触发全量合并。
 *     必须使用 mergeState 合并默认配置，确保云端缺失新版本字段时能自动补全
 *   - loadRemoteConfig 合并后标记 dirty=true，由 handleMissedUploadConfig（下一步）
 *     统一处理上传。不在此处更新 syncId 或触发上传，避免与 MD5 去重逻辑冲突
 *   - loadRemoteConfig 的 new Promise + async 回调是因为 chrome.storage.sync.get
 *     是回调式 API，async 内部需要 await，外层手动 resolve 控制完成时机
 *   - setupPageConfigSync 是页面启动入口，按顺序：状态重置 → 拉取 → 补救未完成的上传 → 监听变化 → 跨标签页同步
 *   - parseStoredData 解析失败会 fallback 到 JSON.parse（兼容旧版本未压缩数据）
 * @see docs/architecture/storage.md#版本感知同步策略
 */
import { defaultConfig, defaultUploadStatusItem } from '@/logic/config/defaults'
import { log } from '@/logic/utils/common'
import { gaProxy } from '@/logic/utils/gtag'
import { compareLeftVersionLessThanRightVersions } from '@/logic/config/version'
import { localConfig, localState } from '@/logic/config/state'
import { mergeState } from '@/logic/config/merge'
import { handleStateResetAndUpdate, updateSetting } from '@/logic/config/update'
import { parseStoredData } from '@/logic/config/compress'
import { showToast } from '@/common/toast'
import { configSizeMap, setupKeyboardSyncListener } from './state'
import {
  uploadConfigFn,
  handleWatchLocalConfigChange,
  handleMissedUploadConfig,
} from './upload'

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

export const loadRemoteConfig = () => {
  log('Load config start')
  // 使用 new Promise 包装 chrome.storage.sync.get（回调式 API）。
  // 回调声明为 async 是因为内部需要 await parseStoredData / Promise.allSettled，
  // async 返回的 Promise 被 Chrome 忽略，但内部 await 能正确执行。
  // resolve/reject 由外层手动调用，不受回调的 async 影响。
  return new Promise((resolve) => {
    console.time('loadRemoteConfig')
    chrome.storage.sync.get(null, async (data) => {
      const error = chrome.runtime.lastError
      if (error) {
        log('Load config error', error)
        showToast.error(
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

            log(
              `Config-${field} syncId mismatch: local=${localSyncId.slice(0, 12)}... cloud=${targetSyncId.slice(0, 12)}...`,
            )

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
              // syncId 暂设为 targetSyncId（云端值）。合并分支末尾统一标记
              // dirty=true，下一步 handleMissedUploadConfig 调用 uploadConfigFn 时
              // 以此为 prevSyncId 与当前数据 MD5 比较，差异则触发上传愈合云端。
              localState.value.isUploadConfigStatusMap[field].syncId =
                targetSyncId
              localState.value.isUploadConfigStatusMap[field].retryCount = 0
              localState.value.isUploadConfigStatusMap[field].lastError = ''
              localState.value.isUploadConfigStatusMap[field].syncStatus =
                'idle'
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
              // syncId 设为 targetSyncId，合并后由 handleMissedUploadConfig 统一上传
              localState.value.isUploadConfigStatusMap[field].syncId =
                targetSyncId
              localState.value.isUploadConfigStatusMap[field].retryCount = 0
              localState.value.isUploadConfigStatusMap[field].lastError = ''
              localState.value.isUploadConfigStatusMap[field].syncStatus =
                'idle'
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

        // 合并后重置状态并标记 dirty=true，交由 handleMissedUploadConfig（下一步）
        // 统一处理上传。不在此处更新 syncId：合并分支中已将 syncId 设为 targetSyncId
        // （云端值），handleMissedUploadConfig 调用 uploadConfigFn 时会与当前数据 MD5
        // 比较——若数据实际变了则上传，未变则 MD5 去重跳过并清除 dirty。
        // 这样利用已有的恢复机制，无需额外引入 heal upload 逻辑。
        for (const field of Object.keys(pendingConfig) as ConfigField[]) {
          const status = localState.value.isUploadConfigStatusMap[field]
          if (status) {
            status.dirty = true
            status.loading = false
            status.retryCount = 0
            status.lastError = ''
            status.syncStatus = 'idle'
          }
        }

        resolve(true)
        gaProxy('click', ['sync', 'download'], { result: 'success' })
      } catch (e) {
        log('Process remote config error', e)
        showToast.error(
          `${window.$t('common.process')}${window.$t('common.setting')}${window.$t('common.fail')}`,
        )
        gaProxy('click', ['sync', 'download'], { result: 'failed' })
        console.timeEnd('loadRemoteConfig')
        resolve(false)
      }
    })
  })
}

export const loadRemoteKeyboardConfig = async () => {
  // 轻量版拉取：只同步 keyboardBookmark 字段，不触发全量合并。
  // 使用 mergeState 合并默认配置，确保云端数据缺失新版本字段时能自动补全。
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
    localState.value.isUploadConfigStatusMap.keyboardBookmark.retryCount = 0
    localState.value.isUploadConfigStatusMap.keyboardBookmark.lastError = ''
    localState.value.isUploadConfigStatusMap.keyboardBookmark.syncStatus =
      'idle'
    // 使用 mergeState 合并，确保云端配置缺失新版本字段时能从默认配置中补全
    localConfig.keyboardBookmark = mergeState(
      defaultConfig.keyboardBookmark,
      parsed.data,
    ) as typeof defaultConfig.keyboardBookmark

    log('Load remote keyboardBookmark config: updated from cloud')
    return true
  } catch (e) {
    log('Load remote keyboardBookmark config error', e)
    return false
  }
}

export const setupPageConfigSync = async () => {
  handleStateResetAndUpdate()
  await loadRemoteConfig()
  await handleMissedUploadConfig()
  handleWatchLocalConfigChange()
  setupKeyboardSyncListener()
}
