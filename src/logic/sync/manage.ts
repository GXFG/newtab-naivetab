/**
 * 配置的导入/导出/重置 用户操作
 *
 * 导入支持旧版本数据格式的自动迁移兼容。
 * 导出将当前完整 localConfig 序列化为 JSON 文件下载。
 */
import { log, downloadJsonByTagA, sleep } from '@/logic/util'
import {
  localConfig,
  localState,
  globalState,
  switchSettingDrawerVisible,
} from '@/logic/store'
import { updateSetting } from '@/logic/config/update'
import { defaultConfig } from '@/logic/config/defaults'
import { normalizeLegacyConfig } from '@/logic/config/migrate'
import { clearDatabase } from '@/logic/database'
import { isUploadConfigLoading } from './state'

const clearStorage = (clearAll = false) => {
  window.$notification.info({
    title: window.$t('generalSetting.clearStorageLabel'),
    content: window.$t('prompts.pleaseWait'),
  })
  return new Promise((resolve) => {
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

export const resetSetting = async () => {
  chrome.storage.sync.clear()
  localStorage.clear()
  await clearDatabase()
  location.reload()
}
