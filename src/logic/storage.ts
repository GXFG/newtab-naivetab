import { useDebounceFn } from '@vueuse/core'
import { log, downloadJsonByTagA, sleep } from './util'
import { CONFIG_FIELD_LIST, MERGE_CONFIG_DELAY } from './const'
import { defaultConfig, localConfig, localState, globalState } from './store'

export const isUploadConfigLoading = computed(() => {
  let isLoading = false
  for (const key of Object.keys(globalState.isUploadConfigLoadingMap)) {
    if (globalState.isUploadConfigLoadingMap[key]) {
      isLoading = true
      break
    }
  }
  return isLoading
})

/**
 * https://developer.chrome.com/docs/extensions/reference/storage/
 * chrome.storage.sync.QUOTA_BYTES_PER_ITEM = 8192  注意单个配置不可超过8k
 */
const uploadConfigFn = (field: ConfigField) => {
  globalState.isUploadConfigLoadingMap[field] = true
  log(`Upload config-${field}`)
  const currTime = Date.now()
  localState.value.syncTimeMap[field] = currTime
  const payload = {
    [`naive-tab-${field}`]: JSON.stringify({
      syncTime: currTime,
      data: localConfig[field],
    }),
  }
  chrome.storage.sync.set(payload, async() => {
    const error = chrome.runtime.lastError
    if (error) {
      log(`Upload config-${field} error`, error)
      window.$message.error(`${window.$t('common.upload')}${window.$t('common.setting')}${window.$t('common.fail')}`)
    } else {
      log(`Upload config-${field} complete`, currTime)
    }
    setTimeout(() => {
      // 确保isUploadConfigLoading的值不会抖动，消除多个配置排队同步时中间出现的短暂值均为false的间隙
      globalState.isUploadConfigLoadingMap[field] = false
    }, 100)
  })
}

const uploadConfigGeneral = useDebounceFn(() => { uploadConfigFn('general') }, MERGE_CONFIG_DELAY)
const uploadConfigBookmark = useDebounceFn(() => { uploadConfigFn('bookmark') }, MERGE_CONFIG_DELAY)
const uploadConfigClockDigital = useDebounceFn(() => { uploadConfigFn('clockDigital') }, MERGE_CONFIG_DELAY)
const uploadConfigClockAnalog = useDebounceFn(() => { uploadConfigFn('clockAnalog') }, MERGE_CONFIG_DELAY)
const uploadConfigDate = useDebounceFn(() => { uploadConfigFn('date') }, MERGE_CONFIG_DELAY)
const uploadConfigCalendar = useDebounceFn(() => { uploadConfigFn('calendar') }, MERGE_CONFIG_DELAY)
const uploadConfigSearch = useDebounceFn(() => { uploadConfigFn('search') }, MERGE_CONFIG_DELAY)
const uploadConfigWeather = useDebounceFn(() => { uploadConfigFn('weather') }, MERGE_CONFIG_DELAY)
const uploadConfigMemo = useDebounceFn(() => { uploadConfigFn('memo') }, MERGE_CONFIG_DELAY)

watch(() => localConfig.general, () => { uploadConfigGeneral() }, { deep: true })
watch(() => localConfig.bookmark, () => { uploadConfigBookmark() }, { deep: true })
watch(() => localConfig.clockDigital, () => { uploadConfigClockDigital() }, { deep: true })
watch(() => localConfig.clockAnalog, () => { uploadConfigClockAnalog() }, { deep: true })
watch(() => localConfig.date, () => { uploadConfigDate() }, { deep: true })
watch(() => localConfig.calendar, () => { uploadConfigCalendar() }, { deep: true })
watch(() => localConfig.search, () => { uploadConfigSearch() }, { deep: true })
watch(() => localConfig.weather, () => { uploadConfigWeather() }, { deep: true })
watch(() => localConfig.memo, () => { uploadConfigMemo() }, { deep: true })

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
 * 以defaultConfig为模板与acceptState进行去重合并
 * acceptState不传递时默认刷新配置结构
 */
export const updateSetting = (acceptRawState = localConfig) => {
  let acceptState = acceptRawState
  return new Promise((resolve) => {
    try {
      const version = +localConfig.general.version.split('.').join('')
      if (version < 0.9) {
        // 继承小于0.9版本的旧配置结构
        log('Version<0.9')
        const oldConfig = {} as any
        for (const configField of CONFIG_FIELD_LIST) {
          oldConfig[configField] = {
            ...JSON.parse(localStorage.getItem(`style-${configField}`) || ''),
            ...JSON.parse(localStorage.getItem(`setting-${configField}`) || ''),
          }
        }
        acceptState = oldConfig
      }
      for (const configField of Object.keys(defaultConfig)) {
        if (!Object.prototype.hasOwnProperty.call(acceptState, configField)) {
          continue
        }
        // 只遍历acceptState内存在的configField
        for (const subField of Object.keys(acceptState[configField])) {
          localConfig[configField][subField] = mergeState(defaultConfig[configField][subField], acceptState[configField][subField])
          // console.log(localConfig[configField][subField], defaultConfig[configField][subField], acceptState[configField][subField])
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
    for (const field of CONFIG_FIELD_LIST) {
      if (!Object.prototype.hasOwnProperty.call(data, `naive-tab-${field}`)) {
        log(`Config-${field} initialize`)
        uploadConfigFn(field)
      } else {
        const targetConfig = JSON.parse(data[`naive-tab-${field}`])
        const targetSyncTime = targetConfig.syncTime
        const localSyncTime = localState.value.syncTimeMap[field]
        if (targetSyncTime === localSyncTime) {
          log(`Config-${field} not update`)
          continue
        }
        if (targetSyncTime < localSyncTime) {
          log(`Config-${field} is overdue, reupload`)
          uploadConfigFn(field)
          continue
        }
        pendingConfig[field] = targetConfig
        localState.value.syncTimeMap[field] = targetSyncTime
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
  window.$notification.info({
    title: window.$t('general.clearStorageLabel'),
    content: window.$t('prompts.pleaseWait'),
  })
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
  window.$message.success(`${window.$t('common.import')}${window.$t('common.success')}`)
  globalState.isImportSettingLoading = false
}

export const exportSetting = () => {
  const filename = `naivetab-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadJsonByTagA(localConfig, filename)
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
