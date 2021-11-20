import { useThrottleFn } from '@vueuse/core'
import { useMessage } from 'naive-ui'
import { globalState } from './store'
import { log, exportStringToFile } from './util'

const message = useMessage()
// chrome.storage.onChanged.addListener((changes: any, namespace: any) => {
//   for (const [key, { oldValue, newValue }] of Object.entries(changes) as any) {
//     console.log(
//       `Storage key "${key}" in namespace "${namespace}" changed.`,
//       `Old value was "${oldValue}", new value is "${newValue}".`,
//     )
//   }
// })

export const uploadSetting = useThrottleFn(() => {
  // chrome.storage.sync.clear()
  log('uploadSetting')
  globalState.setting.lastSyncTimestamp = Date.now()
  const localSetting = JSON.stringify(globalState.setting)
  chrome.storage.sync.set({ MyNewTabSetting: localSetting }, () => {
    log('Upload settings success')
  })
}, 2000)

watch([
  () => globalState.setting.generic,
  () => globalState.setting.bookmarks,
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
      if (cloudSetting.lastSyncTimestamp === globalState.setting.lastSyncTimestamp) {
        log('No settings update')
        return
      }
      log('Update settings', MyNewTabSetting)
      globalState.setting.lastSyncTimestamp = cloudSetting.lastSyncTimestamp
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
    message.error('Once upon a time you dressed so fine')
  }
  if (Object.keys(fileContent).length === 0) {
    return
  }
  log('FileContent', fileContent)
  if (fileContent.generic) {
    globalState.setting.generic = fileContent.generic
  }
  if (fileContent.bookmarks) {
    globalState.setting.bookmarks = fileContent.bookmarks
  }
}

export const exportSetting = () => {
  const filename = `newtab-export-setting-${Date.now()}.json`
  exportStringToFile(globalState.setting, filename)
}
