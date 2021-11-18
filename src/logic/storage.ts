import { useLocalStorage, useThrottleFn } from '@vueuse/core'
import { globalState } from './store'
import { log } from './util'

export const storageDemo = useLocalStorage('webext-demo', 'Storage Demo', { listenToStorageChanges: true })

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
