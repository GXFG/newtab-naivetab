import { useStorageLocal } from '@/composables/useStorageLocal'
import { isChrome } from '@/env'
import { defaultConfig, globalState, localConfig, addVisibilityTask, addPageFocusTask, getAllCommandsConfig, padUrlHttps, log } from '@/logic'

export const getFaviconFromUrl = (url: string) => {
  if (isChrome) {
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=128`
  }
  return `${url}/favicon.ico`
}

export const getDefaultBookmarkNameFromUrl = (url: string) => {
  if (!url) {
    return ''
  }
  const padUrl = padUrlHttps(url)
  const domain = padUrl.split('/')[2]
  if (!domain) {
    return ''
  }
  let name = ''
  if (domain.includes(':')) {
    // 端口地址
    name = `:${domain.split(':')[1]}`
  } else {
    const tempSplitList = domain.split('.')
    name = tempSplitList.includes('www') ? tempSplitList[1] : tempSplitList[0] // 设置默认name
  }
  return name
}

export const getBookmarkConfigName = (code: string) => {
  if (!localConfig.bookmark.keymap[code]) {
    return ''
  }
  return localConfig.bookmark.keymap[code].name || getDefaultBookmarkNameFromUrl(localConfig.bookmark.keymap[code].url)
}

export const getBookmarkConfigUrl = (key: string) => {
  if (!localConfig.bookmark.keymap[key]) {
    return ''
  }
  const url = localConfig.bookmark.keymap[key].url
  if (url.length === 0) {
    return ''
  }
  return padUrlHttps(url)
}

export const resetBookmarkPending = () => {
  localStorage.setItem('data-bookmark-pending', JSON.stringify({
    isPending: false,
  }))
}

const refreshBookmarkConfig = () => {
  // page切换前台时刷新快捷键配置信息
  if (globalState.isSettingDrawerVisible) {
    getAllCommandsConfig()
  }
  // page切换前台时刷新通过pupop修改的书签
  const bookmarkPendingData = useStorageLocal('data-bookmark-pending', {
    isPending: false,
  })
  if (!bookmarkPendingData.value.isPending) {
    return
  }
  log('Update bookmark from popup')
  localConfig.bookmark = useStorageLocal('c-bookmark', defaultConfig.bookmark) as any
  resetBookmarkPending()
}

addPageFocusTask('bookmark', () => {
  refreshBookmarkConfig()
})

addVisibilityTask('bookmark', (hidden) => {
  if (hidden) {
    return
  }
  refreshBookmarkConfig()
})
