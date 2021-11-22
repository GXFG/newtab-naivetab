import dayjs from 'dayjs'
import { useThrottleFn } from '@vueuse/core'
import { globalState } from './store'
import { log, downloadByTagA } from './util'

export const uploadSetting = useThrottleFn(() => {
  // chrome.storage.sync.clear()
  log('uploadSetting')
  globalState.setting.syncTime = Date.now()
  const localSetting = JSON.stringify(globalState.setting)
  chrome.storage.sync.set({ MyNewTabSetting: localSetting }, () => {
    log('Upload settings success')
  })
}, 2000)

watch([
  () => globalState.setting.bookmarks,
  () => globalState.setting.general,
], () => {
  uploadSetting()
}, {
  deep: true,
})

export const downloadSetting = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, ({ MyNewTabSetting }) => {
      if (!MyNewTabSetting) {
        log('No settings')
        return
      }
      const cloudSetting = JSON.parse(MyNewTabSetting)
      if (cloudSetting.syncTime === globalState.setting.syncTime) {
        log('No settings update')
        return
      }
      log('Update settings', MyNewTabSetting)
      globalState.setting.syncTime = cloudSetting.syncTime
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
    window.$message.error('Parse error')
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
}
