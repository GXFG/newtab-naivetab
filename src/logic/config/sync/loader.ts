/**
 * @module loader
 * @description 配置拉取与合并 — 从 chrome.storage.sync 下载、版本感知合并、页面初始化。
 * @dependencies config/merge.ts（mergeState）、config/compress.ts（parseStoredData）、config/update.ts（updateSetting）
 * @consumers config/sync/state.ts（setupPageConfigSync）、popup/Setting 面板（手动同步）
 * @pitfalls
 *   - mergeConfigWithVersionAwareness 比较版本号决定以哪边为模板，版本相同直接使用远程数据
 *   - loadRemoteKeyboardConfig 是轻量版拉取，只同步 keyboardBookmark 字段，不触发全量合并
 *   - setupPageConfigSync 是页面启动入口，按顺序：状态重置 → 拉取 → 补救未完成的上传 → 监听变化 → 跨标签页同步
 *   - parseStoredData 解析失败会 fallback 到 JSON.parse（兼容旧版本未压缩数据）
 * @see docs/architecture/storage.md#版本感知同步策略
 */
import { defaultConfig, defaultUploadStatusItem } from '@/logic/config/defaults'
import { log } from '@/logic/utils/common'
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
        showToast.error(
          `${window.$t('common.process')}${window.$t('common.setting')}${window.$t('common.fail')}`,
        )
        console.timeEnd('loadRemoteConfig')
        resolve(false)
      }
    })
  })
}

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

export const setupPageConfigSync = async () => {
  handleStateResetAndUpdate()
  await loadRemoteConfig()
  await handleMissedUploadConfig()
  handleWatchLocalConfigChange()
  setupKeyboardSyncListener()
}
