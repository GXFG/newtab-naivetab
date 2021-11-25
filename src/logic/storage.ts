import dayjs from 'dayjs'
import { useDebounceFn } from '@vueuse/core'
import { globalState } from './store'
import { MERGE_SETTING_DELAY } from './const'
import { log, downloadByTagA } from './util'

const uploadFn = () => {
  log('Start syncing settings')
  globalState.setting.syncTime = Date.now()
  const localSetting = JSON.stringify(globalState.setting)
  chrome.storage.sync.set({ MyNewTabSetting: localSetting }, () => {
    log('Sync settings complete')
  })
}
const uploadSetting = useDebounceFn(uploadFn, MERGE_SETTING_DELAY)

watch([
  () => globalState.setting.general,
  () => globalState.setting.date,
  () => globalState.setting.clock,
  () => globalState.setting.calendar,
  () => globalState.setting.bookmarks,
], () => {
  uploadSetting()
}, {
  deep: true,
})

export const loadSyncSetting = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, ({ MyNewTabSetting }) => {
      if (!MyNewTabSetting) {
        log('Notfound settings')
        return
      }

      const cloudSetting = JSON.parse(MyNewTabSetting)
      if (cloudSetting.syncTime === globalState.setting.syncTime) {
        log('None modification settings')
        return
      }

      log('Load settings', cloudSetting)
      globalState.setting.syncTime = cloudSetting.syncTime
      if (cloudSetting.general) {
        globalState.setting.general = cloudSetting.general
      }
      if (cloudSetting.date) {
        globalState.setting.date = cloudSetting.date
      }
      if (cloudSetting.clock) {
        globalState.setting.clock = cloudSetting.clock
      }
      if (cloudSetting.calendar) {
        globalState.setting.calendar = cloudSetting.calendar
      }
      if (cloudSetting.bookmarks) {
        globalState.setting.bookmarks = cloudSetting.bookmarks
      }
      resolve(null)
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
  if (fileContent.general) {
    globalState.setting.general = fileContent.general
  }
  if (fileContent.bookmarks) {
    globalState.setting.bookmarks = fileContent.bookmarks
  }
}

export const exportSetting = () => {
  const filename = `newtab-setting-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadByTagA(globalState.setting, filename)
  window.$message.success(window.$t('common.success'))
}
