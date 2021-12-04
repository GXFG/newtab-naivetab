import dayjs from 'dayjs'
import { nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { globalState } from './store'
import { MERGE_SETTING_DELAY } from './const'
import { log, downloadByTagA } from './util'

let isDownLoading = false

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
  () => globalState.setting.clock,
  () => globalState.setting.calendar,
  () => globalState.setting.bookmark,
], () => {
  if (isDownLoading) {
    return
  }
  uploadSetting()
}, {
  deep: true,
})

const updateSetting = (data: any) => {
  if (data.style) {
    globalState.style = data.style
  }
  if (data.setting.general) {
    globalState.setting.general = data.setting.general
  }
  if (data.setting.date) {
    globalState.setting.date = data.setting.date
  }
  if (data.setting.clock) {
    globalState.setting.clock = data.setting.clock
  }
  if (data.setting.calendar) {
    globalState.setting.calendar = data.setting.calendar
  }
  if (data.setting.bookmark) {
    globalState.setting.bookmark = data.setting.bookmark
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

    isDownLoading = true
    log('Load settings', cloudSetting)
    globalState.setting.syncTime = cloudSetting.setting.syncTime
    updateSetting(cloudSetting)

    nextTick(() => {
      isDownLoading = false
    })
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
