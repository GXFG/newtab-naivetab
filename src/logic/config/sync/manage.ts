/**
 * @module manage
 * @description 配置的导入/导出/重置用户操作。
 * @dependencies config/migrate.ts（normalizeLegacyConfig 旧数据兼容）、config/update.ts（updateSetting 写入）
 * @consumers Setting 面板中的导入/导出/重置按钮
 * @pitfalls
 *   - importSetting 必须通过 normalizeLegacyConfig() 处理旧版本数据结构（6 层兼容）
 *   - importSetting 导入后必须更新 syncId/dirty 状态，避免 watch 触发不必要的上传
 *   - clearStorage 等待 isUploadConfigLoading 变为 false 后才执行，避免与同步冲突
 *   - refreshSetting（刷新配置）调用 clearStorage(false) 保留 data-first 标记
 *   - resetSetting（恢复默认）是彻底清除，包含 chrome.storage.sync + localStorage + IndexedDB
 * @see docs/architecture/storage.md#配置导入/导出
 */
import md5 from 'crypto-js/md5'
import { log, sleep } from '@/logic/utils/common'
import { localConfig, localState } from '@/logic/config/state'
import { globalState, switchSettingDrawerVisible } from '@/logic/store/state'
import { updateSetting } from '@/logic/config/update'
import { defaultConfig } from '@/logic/config/defaults'
import { normalizeLegacyConfig } from '@/logic/config/migrate'
import { gaProxy } from '@/logic/utils/gtag'
import { clearDatabase } from '@/logic/utils/database'
import { showToast } from '@/common/toast'
import { isUploadConfigLoading } from './state'
import { getUploadConfigData, cancelAllDebounce } from './upload'

const clearStorage = (clearAll = false) => {
  showToast.info(
    `${window.$t('generalSetting.clearStorageLabel')} — ${window.$t('prompts.pleaseWait')}`,
  )
  return new Promise((resolve) => {
    // 取消所有排队的防抖上传，防止 localStorage 清空后
    // 防抖回调执行时上传空数据或脏数据。
    cancelAllDebounce()

    const cancelListenerSync = watch(isUploadConfigLoading, async (value) => {
      if (value) {
        log('Clear localStorage wait')
        return
      }
      await sleep(1000)
      log('Clear localStorage execute')
      cancelListenerSync()
      localStorage.clear()
      if (!clearAll) {
        localStorage.setItem('data-first', 'false')
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
    showToast.error(`${window.$t('common.import')}${window.$t('common.fail')}`)
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
    // 旧数据结构兼容，统一转为最新格式
    const { config: normalized, extractedIsFocusMode } = normalizeLegacyConfig(
      fileContent as Record<string, any>,
    )
    fileContent = normalized as typeof defaultConfig
    if (extractedIsFocusMode !== undefined) {
      localState.value.isFocusMode = extractedIsFocusMode
    }

    log('FileContentTransform', fileContent)
    fileContent.general.version = window.appVersion
    await updateSetting(fileContent)

    // 导入后重置各字段状态，避免 watch 触发不必要的上传。
    // 注意：导入后 retryCount/lastError/syncStatus 归零，因为是手动操作。
    for (const field of Object.keys(
      localState.value.isUploadConfigStatusMap,
    ) as ConfigField[]) {
      const status = localState.value.isUploadConfigStatusMap[field]
      status.syncId = md5(JSON.stringify(getUploadConfigData(field))).toString()
      status.dirty = false
      status.loading = false
      status.retryCount = 0
      status.lastError = ''
      status.syncStatus = 'idle'
    }

    showToast.success(
      `${window.$t('common.import')}${window.$t('common.success')}`,
    )
    gaProxy('click', ['sync', 'import'], { result: 'success' })
    globalState.isImportSettingLoading = false
    switchSettingDrawerVisible(false)
  } catch (e) {
    log('Import error', e)
    showToast.error(
      `${window.$t('common.import')}${window.$t('common.fail')} ${e}`,
    )
    gaProxy('click', ['sync', 'import'], { result: 'failed' })
    globalState.isImportSettingLoading = false
  }
}

const downloadJson = (
  result: { [propName: string]: unknown },
  filename = 'file',
) => {
  const content = JSON.stringify(result, null, 2)
  const blob = new Blob([content], { type: 'text/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.click()
}

export const exportSetting = () => {
  const filename = `naivetab-v${window.appVersion}-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadJson(localConfig, filename)
  showToast.success(
    `${window.$t('common.export')}${window.$t('common.success')}`,
  )
  gaProxy('click', ['sync', 'export'], { result: 'success' })
}

export const resetSetting = async () => {
  chrome.storage.sync.clear()
  localStorage.clear()
  await clearDatabase()
  location.reload()
}
