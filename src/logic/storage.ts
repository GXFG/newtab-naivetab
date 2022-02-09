import { useDebounceFn } from '@vueuse/core'
import { log, downloadJsonByTagA, mergeState } from './util'
import { MERGE_SETTING_DELAY } from './const'
import { defaultState, localState, globalState } from './store'

const uploadFn = () => {
  log('uploadSetting')
  localState.common.syncTime = Date.now()
  const localData = JSON.stringify({
    syncTime: localState.common.syncTime,
    style: localState.style,
    setting: localState.setting,
  })
  chrome.storage.sync.set({ PuzzleTabSetting: localData }, () => {
    log('Sync settings complete')
  })
}
const uploadSetting = useDebounceFn(uploadFn, MERGE_SETTING_DELAY)

watch([
  () => localState.style,
  () => localState.setting,
], () => {
  uploadSetting()
}, {
  deep: true,
})

/**
 * 处理新增配置，删除无用旧配置
 * 默认刷新配置结构
 * 以defaultState为模板与acceptState进行去重合并
 */
export const updateSetting = (acceptState = localState) => {
  return new Promise((resolve) => {
    for (const rootField of Object.keys(defaultState)) {
      if (!Object.prototype.hasOwnProperty.call(acceptState, rootField)) {
        continue
      }
      // 只遍历acceptState内存在的rootField
      for (const subField of Object.keys(acceptState[rootField])) {
        localState[rootField][subField] = mergeState(defaultState[rootField][subField], acceptState[rootField][subField])
      }
    }
    resolve(true)
  })
}

export const loadSyncSetting = () => {
  chrome.storage.sync.get(null, ({ PuzzleTabSetting }) => {
    if (!PuzzleTabSetting) {
      log('Notfound settings')
      uploadFn() // 初始化设置到云端
      return
    }
    const cloudSetting = JSON.parse(PuzzleTabSetting)
    if (cloudSetting.syncTime === localState.common.syncTime) {
      log('None modification settings')
      return
    }
    log('Load settings', cloudSetting)
    localState.common.syncTime = cloudSetting.syncTime
    updateSetting(cloudSetting)
  })
}

const clearStorage = () => {
  localStorage.clear()
  localStorage.setItem('data-first', 'false') // 避免打开help弹窗
  location.reload()
}

export const refreshSettingAndClearStorage = async() => {
  globalState.value.isClearStorageLoading = true
  await updateSetting()
  // 等待setting同步完成后再进行后续操作
  setTimeout(() => {
    clearStorage()
    globalState.value.isClearStorageLoading = false
  }, 2000)
}

export const importSetting = async(text: string) => {
  if (!text) {
    return
  }
  let fileContent = {} as any
  try {
    fileContent = JSON.parse(text)
  } catch (e) {
    log('Parse error', e)
    window.$message.error(`${window.$t('common.import')}${window.$t('common.fail')}`)
  }
  if (Object.keys(fileContent).length === 0) {
    return
  }
  log('FileContent', fileContent)
  await updateSetting(fileContent)
  clearStorage()
}

export const exportSetting = () => {
  const filename = `puzzletab-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadJsonByTagA({
    style: localState.style,
    setting: localState.setting,
  }, filename)
  window.$message.success(`${window.$t('common.export')}${window.$t('common.success')}`)
}

export const resetSetting = () => {
  chrome.storage.sync.clear()
  clearStorage()
}
