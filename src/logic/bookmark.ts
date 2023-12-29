import { useStorageLocal } from '@/composables/useStorageLocal'
import { isChrome } from '@/env'
import { padUrlHttps, log } from '@/logic/util'
import { defaultConfig } from '@/logic/config'
import { addVisibilityTask, addPageFocusTask } from '@/logic/task'
import { keyboardCurrentModelAllKeyList } from '@/logic/keyboard'
import { globalState, localConfig, getAllCommandsConfig } from '@/logic/store'

const onGetBookmark = (): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree((bookmarks) => {
        resolve(bookmarks)
      })
    } catch (e) {
      reject(e)
    }
  })
}

export const getBrowserBookmark = async () => {
  const res = (await onGetBookmark()) as ChromeBookmarkItem[]
  const root = res[0].children
  return root
}

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

export const state = reactive({
  systemBookmarks: [] as ChromeBookmarkItem[],
  selectedFolderTitleStack: [] as string[],
})

const findTargetFolerBookmark = (folderBookmark: ChromeBookmarkItem[], folderTitleStack: string[]) => {
  try {
    if (folderTitleStack.length === 0) {
      return folderBookmark
    }
    const targetFolder = folderBookmark.find((item) => item.title === folderTitleStack[0])?.children as ChromeBookmarkItem[]
    return findTargetFolerBookmark(targetFolder, folderTitleStack.slice(1))
  } catch (e) {
    console.error(e)
    return []
  }
}

export const currFolderBookmarks = computed(() => {
  if (state.selectedFolderTitleStack.length === 0) {
    return state.systemBookmarks
  }
  return findTargetFolerBookmark(state.systemBookmarks, state.selectedFolderTitleStack)
})

export const getBookmarkConfigName = (keyCode: string, keyIndex: number) => {
  if (localConfig.bookmark.isFromSystemSource) {
    return currFolderBookmarks.value[keyIndex]?.title || ''
  }
  if (!localConfig.bookmark.keymap[keyCode]) {
    return ''
  }
  return localConfig.bookmark.keymap[keyCode].name || getDefaultBookmarkNameFromUrl(localConfig.bookmark.keymap[keyCode].url)
}

export const getBookmarkConfigUrl = (keyCode: string, keyIndex: number) => {
  const targetIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
  console.log(keyCode, targetIndex)
  if (localConfig.bookmark.isFromSystemSource) {
    const bookmarkItem = currFolderBookmarks.value[keyIndex] || {}
    const isFolder = Object.prototype.hasOwnProperty.call(bookmarkItem, 'children')
    return isFolder ? 'type__folder' : bookmarkItem?.url || ''
  }
  if (!localConfig.bookmark.keymap[keyCode]) {
    return ''
  }
  const url = localConfig.bookmark.keymap[keyCode].url
  if (url.length === 0) {
    return ''
  }
  return padUrlHttps(url)
}

export const getBookmarkForKeyboard = async () => {
  const root = await getBrowserBookmark()
  state.systemBookmarks = root[0].children
  console.log(state.systemBookmarks)
}

export const resetBookmarkPending = () => {
  localStorage.setItem(
    'data-bookmark-pending',
    JSON.stringify({
      isPending: false,
    }),
  )
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
