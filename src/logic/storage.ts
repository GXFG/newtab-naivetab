import { useDebounceFn } from '@vueuse/core'
import { log, downloadJsonByTagA, sleep } from './util'
import { MERGE_CONFIG_DELAY } from './const'
import { defaultState, localState, globalState } from './store'

export const isUploadConfigLoading = computed(() => globalState.isUploadConfigLoadingMap.style || globalState.isUploadConfigLoadingMap.setting)

/**
 * https://developer.chrome.com/docs/extensions/reference/storage/
 * chrome.storage.sync.QUOTA_BYTES_PER_ITEM = 8192  注意单个配置不可超过8k
 */
const uploadConfigFn = (field: ConfigField) => {
  globalState.isUploadConfigLoadingMap[field] = true
  log(`Upload config-${field}`)
  localState.common.syncTimeMap[field] = Date.now()
  const syncTime = localState.common.syncTimeMap[field]
  const payload = {
    [`naive-tab-${field}`]: JSON.stringify({
      syncTime,
      data: localState[field],
    }),
  }
  chrome.storage.sync.set(payload, async() => {
    const error = chrome.runtime.lastError
    if (error) {
      log(`Upload config-${field} error`, error)
      window.$message.error(`${window.$t('common.upload')}${window.$t('common.setting')}${window.$t('common.fail')}`)
    } else {
      log(`Upload config-${field} complete`, syncTime)
    }
    setTimeout(() => {
      // 确保isUploadConfigLoading的值不会抖动，消除style 与 setting排队同步时中间出现的短暂二者值均为false的间隙
      globalState.isUploadConfigLoadingMap[field] = false
    }, 100)
  })
}

const uploadConfigStyle = useDebounceFn(() => { uploadConfigFn('style') }, MERGE_CONFIG_DELAY)
const uploadConfigSetting = useDebounceFn(() => { uploadConfigFn('setting') }, MERGE_CONFIG_DELAY)

watch(() => localState.style, () => {
  uploadConfigStyle()
}, {
  deep: true,
})

watch(() => localState.setting, () => {
  uploadConfigSetting()
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
  // 只处理Object类型，其余如Array等对象类型均直接返回acceptState，
  if (Object.prototype.toString.call(acceptState) !== '[object Object]') {
    return acceptState
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
          // console.log(localState[rootField][subField], defaultState[rootField][subField], acceptState[rootField][subField])
        }
      }
      resolve(true)
    } catch (e) {
      log('updateSetting error', e)
    }
  })
}

/**
 * {
 *   `naive-tab-${field}`: '{
 *      syncTime: number
 *      data: {}
 *   }'
 * }
 */
export const downloadConfig = () => {
  chrome.storage.sync.get(null, (data) => {
    const error = chrome.runtime.lastError
    if (error) {
      log('Load config error', error)
      return
    }
    const pendingConfig = {} as any
    const configFieldList = ['style', 'setting'] as ConfigField[]
    for (const field of configFieldList) {
      if (!Object.prototype.hasOwnProperty.call(data, `naive-tab-${field}`)) {
        log(`Config-${field} initialize`)
        uploadConfigFn(field)
      } else {
        const targetConfig = JSON.parse(data[`naive-tab-${field}`])
        if (targetConfig.syncTime === localState.common.syncTimeMap[field]) {
          log(`Config-${field} not update`)
          continue
        }
        if (targetConfig.syncTime < localState.common.syncTimeMap[field]) {
          log(`Config-${field} is overdue, reupload`)
          uploadConfigFn(field)
          continue
        }
        localState.common.syncTimeMap[field] = targetConfig.syncTime
        pendingConfig[field] = targetConfig.data
      }
    }
    if (Object.keys(pendingConfig).length === 0) {
      return
    }
    log('Load config', pendingConfig)
    updateSetting(pendingConfig)
  })
}

const clearStorage = (clearAll = false) => {
  return new Promise((resolve) => {
    const cancelListenerSync = watch(isUploadConfigLoading, async(value) => {
      if (value) {
        log('Clear localStorage wait') // 等待config同步完成、localStorage写入完成后再进行后续操作
        return
      }
      await sleep(1000) // 严格确保同步完成后再执行清除动作
      log('Clear localStorage execute')
      cancelListenerSync()
      localStorage.clear()
      if (!clearAll) {
        localStorage.setItem('data-first', 'false') // 避免打开help弹窗
      }
      resolve(true)
      location.reload()
    })
  })
}

export const refreshSetting = async() => {
  globalState.isClearStorageLoading = true
  await updateSetting()
  await clearStorage()
  globalState.isClearStorageLoading = false
}

export const importSetting = async(text: string) => {
  if (!text) {
    return
  }
  globalState.isImportSettingLoading = true
  let fileContent = {} as any
  try {
    fileContent = JSON.parse(text)
  } catch (e) {
    log('Parse error', e)
    window.$message.error(`${window.$t('common.import')}${window.$t('common.fail')}`)
    globalState.isImportSettingLoading = false
  }
  if (Object.keys(fileContent).length === 0) {
    globalState.isImportSettingLoading = false
    return
  }
  log('FileContent', fileContent)
  await updateSetting(fileContent)
  await clearStorage()
  globalState.isImportSettingLoading = false
}

export const exportSetting = () => {
  const filename = `naivetab-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadJsonByTagA({
    style: localState.style,
    setting: localState.setting,
  }, filename)
  window.$message.success(`${window.$t('common.export')}${window.$t('common.success')}`)
}

export const resetSetting = () => {
  chrome.storage.sync.clear()
  localStorage.clear()
  location.reload()
}

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
