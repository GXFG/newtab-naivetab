import { useDebounceFn } from '@vueuse/core'
import { log, downloadJsonByTagA } from './util'
import { MERGE_SETTING_DELAY } from './const'
import { defaultState, localState, globalState } from './store'

export const checkPermission = (field: OptionsPermission) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.permissions.contains({ permissions: [field] }, (granted) => {
        resolve(granted)
      })
    } catch (e) {
      reject(e)
    }
  })
}

export const requestPermission = (field: OptionsPermission) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.permissions.request({ permissions: [field] }, (granted) => {
        resolve(granted)
      })
    } catch (e) {
      reject(e)
    }
  })
}

const uploadFn = () => {
  globalState.value.isUploadSettingLoading = true
  log('uploadSetting')
  localState.common.syncTime = Date.now()
  const localData = JSON.stringify({
    syncTime: localState.common.syncTime,
    style: localState.style,
    setting: localState.setting,
  })
  chrome.storage.sync.set({ PuzzleTabSetting: localData }, () => {
    log('Sync settings complete')
    globalState.value.isUploadSettingLoading = false
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
 * 以state为模板与acceptState进行递归去重合并
 */
const mergeState = (state: any, acceptState: any) => {
  if (acceptState === undefined || acceptState === null) {
    return state
  }
  // 二者类型不同时，直接返回state，为处理新增state的情况
  if (Object.prototype.toString.call(state) !== Object.prototype.toString.call(acceptState)) {
    return state
  }
  if (typeof acceptState === 'string' || typeof acceptState === 'number' || typeof acceptState === 'boolean') {
    return acceptState
  }
  // 只处理Object类型，其余如Array等对象类型均直接返回state，
  if (Object.prototype.toString.call(acceptState) !== '[object Object]') {
    return state
  }
  // 二者均为Object、且state为空Object时，返回acceptState，如setting中的keymap数据
  if (Object.keys(state).length === 0) {
    return acceptState
  }
  const filterState = {} as any
  const fieldList = Object.keys(acceptState)
  for (const field of fieldList) {
    // 递归合并，只合并state内存在的字段
    if (Object.prototype.hasOwnProperty.call(state, field)) {
      filterState[field] = mergeState(state[field], acceptState[field])
    }
  }
  return { ...state, ...filterState }
}

/**
 * 处理新增配置，删除无用旧配置
 * 默认刷新配置结构
 * 以defaultState为模板与acceptState进行去重合并
 */
export const updateSetting = (acceptState = localState) => {
  return new Promise((resolve) => {
    try {
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
    } catch (e) {
      log('updateSetting error', e)
    }
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

export const refreshSetting = async() => {
  globalState.value.isClearStorageLoading = true
  await updateSetting()
  // 等待setting同步完成后再进行后续操作
  const stopWatch = watch(() => globalState.value.isUploadSettingLoading, async(value) => {
    if (value) {
      return
    }
    stopWatch()
    await nextTick()
    clearStorage()
    globalState.value.isClearStorageLoading = false
  })
}

export const importSetting = async(text: string) => {
  if (!text) {
    return
  }
  globalState.value.isImportSettingLoading = true
  let fileContent = {} as any
  try {
    fileContent = JSON.parse(text)
  } catch (e) {
    log('Parse error', e)
    window.$message.error(`${window.$t('common.import')}${window.$t('common.fail')}`)
    globalState.value.isImportSettingLoading = false
  }
  if (Object.keys(fileContent).length === 0) {
    globalState.value.isImportSettingLoading = false
    return
  }
  log('FileContent', fileContent)
  await updateSetting(fileContent)
  const stopWatch = watch(() => globalState.value.isUploadSettingLoading, async(value) => {
    if (value) {
      return
    }
    stopWatch()
    await nextTick()
    clearStorage()
    globalState.value.isImportSettingLoading = false
  })
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
