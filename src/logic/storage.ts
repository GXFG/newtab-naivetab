import dayjs from 'dayjs'
import { useDebounceFn } from '@vueuse/core'
import { globalState } from './store'
import { MERGE_SETTING_DELAY } from './const'
import { log, downloadByTagA } from './util'

const uploadFn = () => {
  log('Start syncing settings')
  globalState.setting.syncTime = Date.now()
  const localData = JSON.stringify({
    style: globalState.style,
    setting: globalState.setting,
  })
  chrome.storage.sync.set({ MyNewTabSetting: localData }, () => {
    log('Sync settings complete')
  })
}
const uploadSetting = useDebounceFn(uploadFn, MERGE_SETTING_DELAY)

watch([
  () => globalState.style,
  () => globalState.setting.general,
  () => globalState.setting.date,
  () => globalState.setting.clockDigital,
  () => globalState.setting.calendar,
  () => globalState.setting.bookmark,
], () => {
  uploadSetting()
}, {
  deep: true,
})

const updateSetting = (data: any) => {
  if (data.style.general) {
    globalState.style.general = { ...globalState.style.general, ...data.style.general }
  }
  if (data.style.date) {
    globalState.style.date = { ...globalState.style.date, ...data.style.date }
  }
  if (data.style.clockDigital) {
    globalState.style.clockDigital = { ...globalState.style.clockDigital, ...data.style.clockDigital }
  }
  if (data.style.clockAnalog) {
    globalState.style.clockAnalog = { ...globalState.style.clockAnalog, ...data.style.clockAnalog }
  }
  if (data.style.calendar) {
    globalState.style.calendar = { ...globalState.style.calendar, ...data.style.calendar }
  }
  if (data.style.bookmark) {
    globalState.style.bookmark = { ...globalState.style.bookmark, ...data.style.bookmark }
  }

  if (data.setting.general) {
    globalState.setting.general = { ...globalState.setting.general, ...data.setting.general }
  }
  if (data.setting.date) {
    globalState.setting.date = { ...globalState.setting.date, ...data.setting.date }
  }
  if (data.setting.clockDigital) {
    globalState.setting.clockDigital = { ...globalState.setting.clockDigital, ...data.setting.clockDigital }
  }
  if (data.setting.clockAnalog) {
    globalState.setting.clockAnalog = { ...globalState.setting.clockAnalog, ...data.setting.clockAnalog }
  }
  if (data.setting.calendar) {
    globalState.setting.calendar = { ...globalState.setting.calendar, ...data.setting.calendar }
  }
  if (data.setting.bookmark) {
    globalState.setting.bookmark = { ...globalState.setting.bookmark, ...data.setting.bookmark }
  }
}

export const loadSyncSetting = () => {
  chrome.storage.sync.get(null, ({ MyNewTabSetting }) => {
    if (!MyNewTabSetting) {
      log('Notfound settings')
      return
    }

    const cloudSetting = JSON.parse(MyNewTabSetting)
    if (cloudSetting.setting.syncTime === globalState.setting.syncTime) {
      log('None modification settings')
      return
    }

    log('Load settings', cloudSetting)
    globalState.setting.syncTime = cloudSetting.setting.syncTime
    updateSetting(cloudSetting)
  })
}

export const importSetting = (text: string) => {
  if (!text) {
    return
  }

  let fileContent = {} as any
  try {
    fileContent = JSON.parse(text)
  } catch (e) {
    log('Parse error', e)
    window.$message.error(window.$t('common.fail'))
  }

  if (Object.keys(fileContent).length === 0) {
    return
  }

  log('FileContent', fileContent)
  updateSetting(fileContent)
}

export const exportSetting = () => {
  const filename = `pazzletab-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadByTagA({
    style: globalState.style,
    setting: globalState.setting,
  }, filename)
  window.$message.success(window.$t('common.success'))
}

export const resetSetting = () => {
  chrome.storage.sync.clear()
  localStorage.clear()
  location.reload()
}
