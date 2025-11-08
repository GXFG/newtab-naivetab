/* eslint-disable no-irregular-whitespace */
import md5 from 'crypto-js/md5'
import { useDebounceFn } from '@vueuse/core'
import { MERGE_CONFIG_DELAY, MERGE_CONFIG_MAX_DELAY, KEYBOARD_OLD_TO_NEW_CODE_MAP } from '@/logic/const'
import { defaultConfig, defaultUploadStatusItem } from '@/logic/config'
import { compareLeftVersionLessThanRightVersions, log, downloadJsonByTagA, sleep } from '@/logic/util'
import { localConfig, localState, globalState, switchSettingDrawerVisible } from '@/logic/store'

export const getLocalVersion = () => {
  let version = localConfig.general.version
  // handle old version 兼容小于0.9版本的旧数据结构
  const settingGeneral = localStorage.getItem('c-general')
  if (settingGeneral) {
    version = JSON.parse(settingGeneral).version
  }
  return version || '0'
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
 * 注意单个配置不可超过 8KB chrome.storage.sync.QUOTA_BYTES_PER_ITEM = 8192
 * 最大项目数量 (MAX_ITEMS)​​                        ​​512个​​      在sync存储区中最多能保存的键值对数量 。
 * ​​总存储容量 (QUOTA_BYTES)​​ ​                       ​约100 KB​​   所有同步数据（包括键和值的JSON字符串）的总大小上限 。
 * ​单个项目大小（QUOTA_BYTES_PER_ITEM）​​            ​约8 KB​​     每个键值对经过JSON序列化后的大小限制 。
 * ​写入操作频率 (MAX_WRITE_OPERATIONS_PER_HOUR)​​    ​​1800次​​     每小时所有set, remove, clear操作的总次数限制 。
 * ​写入操作频率 (MAX_WRITE_OPERATIONS_PER_MINUTE)​​  ​​120次​​      每分钟所有set, remove, clear操作的总次数限制 。
 */
const uploadConfigFn = (field: ConfigField) => {
  return new Promise((resolve) => {
    if (!localState.value.isUploadConfigStatusMap[field]) {
      localState.value.isUploadConfigStatusMap[field] = defaultUploadStatusItem
    }
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

export const handleWatchLocalConfigChange = () => {
  const fieldList = Object.keys(localConfig) as ConfigField[]
  for (const field of fieldList) {
    const uploadConfigFn = genWathUploadConfigFn(field)
    watch(
      () => localConfig[field],
      () => {
        uploadConfigFn()
      },
      { deep: true },
    )
  }
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
    Object.prototype.hasOwnProperty.call(state, 'KeyQ')
    || Object.prototype.hasOwnProperty.call(state, 'KeyA')
    || Object.prototype.hasOwnProperty.call(state, 'KeyZ')
    || Object.prototype.hasOwnProperty.call(state, 'Digit1')
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
      // 只处理存在于acceptState中的配置字段，减少不必要的处理
      const configFields = Object.keys(defaultConfig).filter((field) =>
        Object.prototype.hasOwnProperty.call(acceptState, field),
      ) as ConfigField[]

      for (const configField of configFields) {
        // 获取需要更新的子字段
        const subFields = Object.keys(defaultConfig[configField])

        // 批量处理子字段，减少循环内的操作
        for (const subField of subFields) {
          if (acceptState[configField][subField] !== undefined) {
            localConfig[configField][subField] = mergeState(
              defaultConfig[configField][subField],
              acceptState[configField][subField],
            )
            // console.log(`${configField}-${subField}`, localConfig[configField][subField], '=', defaultConfig[configField][subField], '<-', acceptState[configField][subField])
          }
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
 *      data: typeof defaultConfig[ConfigField]
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
        window.$message.error(`${window.$t('common.sync')}${window.$t('common.setting')}${window.$t('common.fail')}`)
        resolve(false)
        console.timeEnd('loadRemoteConfig')
        return
      }
      try {
        const pendingConfig = {} as typeof defaultConfig
        for (const field of Object.keys(defaultConfig) as ConfigField[]) {
          if (!Object.prototype.hasOwnProperty.call(data, `naive-tab-${field}`)) {
            log(`Config-${field} initialize`)
            uploadConfigFn(field)
          } else {
            const target: {
              syncTime: number
              syncId: string // md5
              data: (typeof defaultConfig)[ConfigField]
            } = JSON.parse(data[`naive-tab-${field}`])
            const targetConfig = target.data
            const targetSyncTime = target.syncTime
            const targetSyncId = target.syncId
            const localSyncTime = localState.value.isUploadConfigStatusMap[field].syncTime
            const localSyncId = localState.value.isUploadConfigStatusMap[field].syncId
            chrome.storage.sync.getBytesInUse(`naive-tab-${field}`).then((bytesInUse) => {
              log(`naive-tab-${field}`, `${bytesInUse} byte`)
            })
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
            pendingConfig[field] = targetConfig as any
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
      } catch (e) {
        log('Process remote config error', e)
        window.$message.error(`${window.$t('common.process')}${window.$t('common.setting')}${window.$t('common.fail')}`)
        console.timeEnd('loadRemoteConfig')
        resolve(false)
      }
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
  let fileContent = null as typeof defaultConfig | null
  try {
    fileContent = JSON.parse(text)
  } catch (e) {
    log('Parse error', e)
    window.$message.error(`${window.$t('common.import')}${window.$t('common.fail')}`)
    globalState.isImportSettingLoading = false
  }
  if (!fileContent || (fileContent && Object.keys(fileContent).length === 0) || !fileContent?.general?.version) {
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
      const oldBookmarkConfig = fileContent.bookmark as (typeof defaultConfig)['bookmark'] & {
        margin?: number
        width?: number
        fontFamily?: string
        fontSize?: number
        backgroundColor?: string[]
        BackgroundActiveColor?: string[]
        isShadowEnabled?: boolean
        shadowColor?: string[]
      }
      delete oldBookmarkConfig.margin
      delete oldBookmarkConfig.width
      delete oldBookmarkConfig.fontFamily
      delete oldBookmarkConfig.fontSize
      delete oldBookmarkConfig.backgroundColor
      delete oldBookmarkConfig.BackgroundActiveColor
      delete oldBookmarkConfig.isShadowEnabled
      delete oldBookmarkConfig.shadowColor
    }
    log('FileContentTransform', fileContent)
    fileContent.general.version = window.appVersion // 更新版本号
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
  const filename = `naivetab-v${window.appVersion}-${dayjs().format('YYYYMMDD-HHmmss')}.json`
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
