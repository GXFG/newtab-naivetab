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
    if (cloudSetting.style) {
      globalState.style = cloudSetting.style
    }
    if (cloudSetting.setting.general) {
      globalState.setting.general = cloudSetting.setting.general
    }
    if (cloudSetting.setting.date) {
      globalState.setting.date = cloudSetting.setting.date
    }
    if (cloudSetting.setting.clock) {
      globalState.setting.clock = cloudSetting.setting.clock
    }
    if (cloudSetting.setting.calendar) {
      globalState.setting.calendar = cloudSetting.setting.calendar
    }
    if (cloudSetting.setting.bookmark) {
      globalState.setting.bookmark = cloudSetting.setting.bookmark
    }

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
  if (fileContent.style) {
    globalState.style = fileContent.style
  }
  if (fileContent.setting.general) {
    globalState.setting.general = fileContent.setting.general
  }
  if (fileContent.setting.clock) {
    globalState.setting.clock = fileContent.setting.clock
  }
  if (fileContent.setting.date) {
    globalState.setting.date = fileContent.setting.date
  }
  if (fileContent.setting.calendar) {
    globalState.setting.calendar = fileContent.setting.calendar
  }
  if (fileContent.setting.bookmark) {
    globalState.setting.bookmark = fileContent.setting.bookmark
  }
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
