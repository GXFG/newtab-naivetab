import { useDebounceFn } from '@vueuse/core'
import { log, downloadJsonByTagA, mergeState } from './util'
import { MERGE_SETTING_DELAY } from './const'
import { localState } from './store'

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

const updateSetting = (data: any) => {
  return new Promise((resolve) => {
    for (const rootField of ['style', 'setting']) {
      for (const field of Object.keys(localState[rootField])) {
        // 忽略掉本地不存在的配置
        if (Object.prototype.hasOwnProperty.call(data[rootField], field)) {
          localState[rootField][field] = mergeState(localState[rootField][field], data[rootField][field])
        }
      }
    }
    resolve(true)
  })
}

export const loadSyncSetting = () => {
  chrome.storage.sync.get(null, ({ PuzzleTabSetting }) => {
    if (!PuzzleTabSetting) {
      log('Notfound settings')
      uploadFn() // 初始化默认设置数据到云端
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

export const clearStorage = () => {
  localStorage.clear()
  localStorage.setItem('data-first', 'false') // 避免打开help弹窗
  location.reload()
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
