import md5 from 'crypto-js/md5'
import { useDebounceFn } from '@vueuse/core'
import { MERGE_CONFIG_DELAY, MERGE_CONFIG_MAX_DELAY, KEYBOARD_OLD_TO_NEW_CODE_MAP } from '@/logic/const'
import { defaultConfig } from '@/logic/config'
import { compareLeftVersionLessThanRightVersions, log, downloadJsonByTagA, sleep } from '@/logic/util'
import { localConfig, localState, globalState, switchSettingDrawerVisible } from '@/logic/store'
import pkg from '../../package.json'

export const getLocalVersion = () => {
  let version = localConfig.general.version
  // handle old version 兼容小于0.9版本的旧数据结构
  const settingGeneral = localStorage.getItem('setting-general')
  if (settingGeneral) {
    version = JSON.parse(settingGeneral).version || 0
  }
  return version
}

export const isUploadConfigLoading = computed(() => {
  if (!Object.prototype.hasOwnProperty.call(localState.value, 'isUploadConfigStatusMap')) {
    return false
  }
  let isLoading = false
  for (const key of Object.keys(localState.value.isUploadConfigStatusMap)) {
    if (localState.value.isUploadConfigStatusMap[key].loading) {
      isLoading = true
      break
    }
  }
  return isLoading
})

/**
 * https://developer.chrome.com/docs/extensions/reference/storage/
 * 注意单个配置不可超过8k chrome.storage.sync.QUOTA_BYTES_PER_ITEM = 8192
 */
const uploadConfigFn = (field: ConfigField) => {
  return new Promise((resolve) => {
    localState.value.isUploadConfigStatusMap[field].loading = true
    log(`Upload config-${field} start`)
    const currTime = Date.now()
    const currConfigMd5 = md5(JSON.stringify(localConfig[field])).toString()
    localState.value.isUploadConfigStatusMap[field].syncTime = currTime
    localState.value.isUploadConfigStatusMap[field].syncId = currConfigMd5
    const payload = {
      [`naive-tab-${field}`]: JSON.stringify({
        syncTime: currTime,
        syncId: currConfigMd5,
        data: localConfig[field],
      }),
    }
    chrome.storage.sync.set(payload, async () => {
      const error = chrome.runtime.lastError
      if (error) {
        log(`Upload config-${field} error`, error)
        window.$message.error(`${window.$t('common.upload')}${window.$t('common.setting')}${window.$t('common.fail')}`)
      } else {
        log(`Upload config-${field} complete`)
      }
      setTimeout(() => {
        // 确保isUploadConfigLoading的值不会抖动，消除多个配置排队同步时中间出现的短暂值均为false的间隙
        localState.value.isUploadConfigStatusMap[field].loading = false
        resolve(true)
      }, 100)
    })
  })
}

const genUploadConfigDebounceFn = (field: ConfigField) => {
  return useDebounceFn(
    () => {
      uploadConfigFn(field)
    },
    MERGE_CONFIG_DELAY,
    { maxWait: MERGE_CONFIG_MAX_DELAY },
  )
}

const genWathUploadConfigFn = (field: ConfigField) => {
  const debounceFn = genUploadConfigDebounceFn(field)
  return () => {
    localState.value.isUploadConfigStatusMap[field].loading = true
    log(`Upload config-${field} ready`)
    debounceFn()
  }
}

const uploadConfigGeneral = genWathUploadConfigFn('general')
const uploadConfigBookmark = genWathUploadConfigFn('bookmark')
const uploadConfigClockDigital = genWathUploadConfigFn('clockDigital')
const uploadConfigClockAnalog = genWathUploadConfigFn('clockAnalog')
const uploadConfigDate = genWathUploadConfigFn('date')
const uploadConfigCalendar = genWathUploadConfigFn('calendar')
const uploadConfigSearch = genWathUploadConfigFn('search')
const uploadConfigWeather = genWathUploadConfigFn('weather')
const uploadConfigMemo = genWathUploadConfigFn('memo')
const uploadConfigNews = genWathUploadConfigFn('news')

export const handleWatchLocalConfigChange = () => {
  watch(
    () => localConfig.general,
    () => {
      uploadConfigGeneral()
    },
    { deep: true },
  )
  watch(
    () => localConfig.bookmark,
    () => {
      uploadConfigBookmark()
    },
    { deep: true },
  )
  watch(
    () => localConfig.clockDigital,
    () => {
      uploadConfigClockDigital()
    },
    { deep: true },
  )
  watch(
    () => localConfig.clockAnalog,
    () => {
      uploadConfigClockAnalog()
    },
    { deep: true },
  )
  watch(
    () => localConfig.date,
    () => {
      uploadConfigDate()
    },
    { deep: true },
  )
  watch(
    () => localConfig.calendar,
    () => {
      uploadConfigCalendar()
    },
    { deep: true },
  )
  watch(
    () => localConfig.search,
    () => {
      uploadConfigSearch()
    },
    { deep: true },
  )
  watch(
    () => localConfig.weather,
    () => {
      uploadConfigWeather()
    },
    { deep: true },
  )
  watch(
    () => localConfig.memo,
    () => {
      uploadConfigMemo()
    },
    { deep: true },
  )
  watch(
    () => localConfig.news,
    () => {
      uploadConfigNews()
    },
    { deep: true },
  )
}

/**
 * 以 state 为基础模板与 acceptState 进行递归去重合并
 */
const mergeState = (state: unknown, acceptState: unknown) => {
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
  // 只处理纯Object类型，其余如Array等对象类型均直接返回acceptState
  if (Object.prototype.toString.call(acceptState) !== '[object Object]') {
    return acceptState
  }
  // 二者均为Object，且state为空Object时，返回acceptState
  if (Object.keys(state as object).length === 0) {
    return acceptState
  }
  // 特殊处理 bookmark.keymap 数据，直接返回acceptState
  if (
    Object.prototype.hasOwnProperty.call(state, 'KeyQ') ||
    Object.prototype.hasOwnProperty.call(state, 'KeyA') ||
    Object.prototype.hasOwnProperty.call(state, 'KeyZ') ||
    Object.prototype.hasOwnProperty.call(state, 'Digit1')
  ) {
    return acceptState
  }
  const filterState = {} as { [propName: string]: unknown }
  const fieldList = Object.keys(acceptState)
  for (const field of fieldList) {
    // 递归合并，只合并state内存在的字段
    if (Object.prototype.hasOwnProperty.call(state, field)) {
      filterState[field] = mergeState((state as object)[field], acceptState[field])
    }
  }
  return { ...(state as object), ...filterState }
}

/**
 * 处理新增配置，并删除无用旧配置。默认acceptState不传递时为刷新配置数据结构
 * 以 defaultConfig 为模板与 acceptState 进行去重合并
 */
export const updateSetting = (acceptRawState = localConfig): Promise<boolean> => {
  const acceptState = acceptRawState
  return new Promise((resolve) => {
    try {
      for (const configField of Object.keys(defaultConfig) as ConfigField[]) {
        // 只遍历 acceptState 内存在的 configField
        if (!Object.prototype.hasOwnProperty.call(acceptState, configField)) {
          // console.log(`!${configField}`)
          continue
        }
        for (const subField of Object.keys(defaultConfig[configField])) {
          localConfig[configField][subField] = mergeState(defaultConfig[configField][subField], acceptState[configField][subField])
          // console.log(`${configField}-${subField}`, localConfig[configField][subField], '=', defaultConfig[configField][subField], '<-', acceptState[configField][subField])
        }
      }
      log('UpdateSetting', localConfig)
      resolve(true)
    } catch (e) {
      log('updateSetting error', e)
      resolve(false)
    }
  })
}

export const handleMissedUploadConfig = async () => {
  for (const field of Object.keys(localState.value.isUploadConfigStatusMap) as ConfigField[]) {
    if (localState.value.isUploadConfigStatusMap[field].loading) {
      log('Handle Missed upload config', field)
      uploadConfigFn(field)
    }
  }
}

/**
 * 载入远程配置信息
 * chrome.storage 格式示例：
 * {
 *   `naive-tab-${field}`: '{
 *      syncTime: number
 *      syncId: md5
 *      data: {}
 *   }'
 * }
 */
export const loadRemoteConfig = () => {
  log('Load config start')
  return new Promise((resolve) => {
    console.time('loadRemoteConfig')
    chrome.storage.sync.get(null, async (data) => {
      const error = chrome.runtime.lastError
      if (error) {
        log('Load config error', error)
        return
      }
      const pendingConfig = {} as typeof defaultConfig
      for (const field of Object.keys(defaultConfig) as ConfigField[]) {
        if (!Object.prototype.hasOwnProperty.call(data, `naive-tab-${field}`)) {
          log(`Config-${field} initialize`)
          uploadConfigFn(field)
        } else {
          const target: {
            syncTime: number
            syncId: string // md5
            data: any
          } = JSON.parse(data[`naive-tab-${field}`])
          const targetConfig = target.data
          const targetSyncTime = target.syncTime
          const targetSyncId = target.syncId
          const localSyncTime = localState.value.isUploadConfigStatusMap[field].syncTime
          const localSyncId = localState.value.isUploadConfigStatusMap[field].syncId
          // syncId(md5)一致时无需更新
          if (targetSyncId === localSyncId) {
            log(`Config-${field} no update`)
            continue
          }
          // 云端配置过期时直接上传本地配置
          if (targetSyncTime < localSyncTime) {
            log(`Config-${field} is overdue, reupload`)
            uploadConfigFn(field)
            continue
          }
          log(`Config-${field} update`)
          pendingConfig[field] = targetConfig
          localState.value.isUploadConfigStatusMap[field].syncTime = targetSyncTime
          localState.value.isUploadConfigStatusMap[field].syncId = targetSyncId
        }
      }
      console.timeEnd('loadRemoteConfig')
      if (Object.keys(pendingConfig).length === 0) {
        resolve(true)
        return
      }
      log('Load config done', pendingConfig)
      await updateSetting(pendingConfig)
      resolve(true)
    })
  })
}

const clearStorage = (clearAll = false) => {
  window.$notification.info({
    title: window.$t('general.clearStorageLabel'),
    content: window.$t('prompts.pleaseWait'),
  })
  return new Promise((resolve) => {
    const cancelListenerSync = watch(isUploadConfigLoading, async (value) => {
      if (value) {
        log('Clear localStorage wait') // 等待config同步完成、localStorage写入完成后再进行后续操作
        return
      }
      await sleep(1000) // 严格确保配置上传完成后再执行清除动作
      log('Clear localStorage execute')
      cancelListenerSync()
      localStorage.clear()
      if (!clearAll) {
        localStorage.setItem('data-first', 'false') // 避免打开help弹窗
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
  try {
    // handle old version 兼容小于1.9.0版本的旧bookmark keymap结构
    if (compareLeftVersionLessThanRightVersions(fileContent.general.version, '1.9.0')) {
      for (const keyLabel of Object.keys(fileContent.bookmark.keymap)) {
        const newKeycode = KEYBOARD_OLD_TO_NEW_CODE_MAP[keyLabel]
        if (newKeycode) {
          fileContent.bookmark.keymap[newKeycode] = fileContent.bookmark.keymap[keyLabel]
          delete fileContent.bookmark.keymap[keyLabel]
        }
      }
      delete fileContent.bookmark.margin
      delete fileContent.bookmark.width
      delete fileContent.bookmark.fontFamily
      delete fileContent.bookmark.fontSize
      delete fileContent.bookmark.backgroundColor
      delete fileContent.bookmark.BackgroundActiveColor
      delete fileContent.bookmark.isShadowEnabled
      delete fileContent.bookmark.shadowColor
    }
    log('FileContentTransform', fileContent)
    fileContent.general.version = pkg.version // 更新版本号
    await updateSetting(fileContent)
    window.$message.success(`${window.$t('common.import')}${window.$t('common.success')}`)
    globalState.isImportSettingLoading = false
    switchSettingDrawerVisible(false)
  } catch (e) {
    log('Import error', e)
    window.$message.error(`${window.$t('common.import')}${window.$t('common.fail')} ${e}`)
    globalState.isImportSettingLoading = false
  }
}

export const exportSetting = () => {
  const filename = `naivetab-v${pkg.version}-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadJsonByTagA(localConfig, filename)
  window.$message.success(`${window.$t('common.export')}${window.$t('common.success')}`)
}

export const resetSetting = () => {
  chrome.storage.sync.clear()
  localStorage.clear()
  location.reload()
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
