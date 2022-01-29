import { useDebounceFn } from '@vueuse/core'
import { globalState } from './store'
import { MERGE_SETTING_DELAY } from './const'
import { log, downloadJsonByTagA } from './util'

const uploadFn = () => {
  globalState.syncTime = Date.now()
  const localData = JSON.stringify({
    syncTime: globalState.syncTime,
    style: globalState.style,
    setting: globalState.setting,
  })
  chrome.storage.sync.set({ PuzzleTabSetting: localData }, () => {
    log('Sync settings complete')
  })
}
const uploadSetting = useDebounceFn(uploadFn, MERGE_SETTING_DELAY)

watch([
  () => globalState.style,
  () => globalState.setting,
], () => {
  uploadSetting()
}, {
  deep: true,
})

/**
 * 只合并当前配置内存在的字段
 */
const mergeSetting = (state: any, acceptState: any) => {
  const filterState = {} as any
  const fieldList = Object.keys(acceptState)
  for (const field of fieldList) {
    if (field in state) {
      filterState[field] = acceptState[field]
    }
  }
  return { ...state, ...filterState }
}

const updateSetting = (data: any) => {
  return new Promise((resolve) => {
    for (const field of Object.keys(globalState.style)) {
      if (Object.prototype.hasOwnProperty.call(data.style, field)) {
        globalState.style[field] = mergeSetting(globalState.style[field], data.style[field])
      }
    }
    for (const field of Object.keys(globalState.setting)) {
      if (Object.prototype.hasOwnProperty.call(data.setting, field)) {
        globalState.setting[field] = mergeSetting(globalState.setting[field], data.setting[field])
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
    if (cloudSetting.syncTime === globalState.syncTime) {
      log('None modification settings')
      return
    }

    log('Load settings', cloudSetting)
    globalState.syncTime = cloudSetting.syncTime
    updateSetting(cloudSetting)
  })
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
  location.reload()
}

export const exportSetting = () => {
  const filename = `puzzletab-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadJsonByTagA({
    style: globalState.style,
    setting: globalState.setting,
  }, filename)
  window.$message.success(`${window.$t('common.export')}${window.$t('common.success')}`)
}

export const resetSetting = () => {
  chrome.storage.sync.clear()
  localStorage.clear()
  location.reload()
}
