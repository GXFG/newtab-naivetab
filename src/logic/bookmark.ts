import { gaProxy } from '@/logic/gtag'
import { isChrome } from '@/env'
import { requestPermission } from '@/logic/storage'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { createTab, padUrlHttps, log } from '@/logic/util'
import { defaultConfig } from '@/logic/config'
import { addVisibilityTask, addPageFocusTask } from '@/logic/task'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG, currKeyboardConfig, keyboardCurrentModelAllKeyList } from '@/logic/keyboard'
import { globalState, localConfig, getAllCommandsConfig, getStyleField } from '@/logic/store'

const CNAME = 'bookmark'

export const state = reactive({
  systemBookmarks: [] as ChromeBookmarkItem[],
  selectedFolderTitleStack: [] as string[],
  isLoadPageLoading: false,
  currSelectKeyCode: '',
})

const getChromeBookmark = (): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
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
  const res = (await getChromeBookmark()) as ChromeBookmarkItem[]
  const root = res[0].children
  return root
}

export const getBrowserBookmarkForKeyboard = async () => {
  if (localConfig.bookmark.source !== 1) {
    return
  }
  try {
    const root = await getBrowserBookmark()
    state.systemBookmarks = root[0].children
  } catch (e) {
    console.warn(e)
    window.$dialog.create({
      title: window.$t('common.confirm'),
      content: window.$t('permission.bookmark'),
      closable: false,
      closeOnEsc: false,
      maskClosable: false,
      positiveText: window.$t('common.allow'),
      negativeText: window.$t('common.deny'),
      onPositiveClick: async () => {
        const granted = await requestPermission('bookmarks')
        if (!granted) {
          return
        }
        getBrowserBookmarkForKeyboard()
      },
      onNegativeClick: () => {
        localConfig.bookmark.source = 2
      },
    })
  }
}

export const initBookmarkData = () => {
  getBrowserBookmarkForKeyboard()
  state.selectedFolderTitleStack = localConfig.bookmark.defaultExpandFolder ? [localConfig.bookmark.defaultExpandFolder] : []
}

export const getFaviconFromUrl = (url: string) => {
  if (isChrome) {
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=128`
  }
  if (url.slice(-1) === '/') {
    return `${url}favicon.ico`
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

const findTargetFolderBookmark = (folderBookmark: ChromeBookmarkItem[], folderTitleStack: string[]) => {
  try {
    if (folderTitleStack.length === 0) {
      return folderBookmark
    }
    const targetFolder = folderBookmark.find((item) => item.title === folderTitleStack[0])?.children as ChromeBookmarkItem[]
    return findTargetFolderBookmark(targetFolder, folderTitleStack.slice(1))
  } catch (e) {
    console.error(e)
    return []
  }
}

export const currFolderBookmarks = computed(() => {
  if (state.systemBookmarks.length === 0) {
    return []
  }
  if (state.selectedFolderTitleStack.length === 0) {
    return state.systemBookmarks
  }
  return findTargetFolderBookmark(state.systemBookmarks, state.selectedFolderTitleStack) || []
})

export const handleSpecialKeycapExec = (keyCode: string, keycapType: KeycapType) => {
  if (keycapType === 'folder') {
    const targetKeyIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
    const bookmarkItem = currFolderBookmarks.value[targetKeyIndex - 1] || {}
    state.selectedFolderTitleStack.push(bookmarkItem.title)
    return true
  }
  if (keycapType === 'back') {
    state.selectedFolderTitleStack.pop()
    return true
  }
  return false
}

export const getBookmarkConfigName = (keyCode: string) => {
  if (!localConfig.bookmark.keymap[keyCode]) {
    return ''
  }
  return localConfig.bookmark.keymap[keyCode].name || getDefaultBookmarkNameFromUrl(localConfig.bookmark.keymap[keyCode].url)
}

export const getBookmarkConfigUrl = (keyCode: string) => {
  if (!localConfig.bookmark.keymap[keyCode]) {
    return ''
  }
  const url = localConfig.bookmark.keymap[keyCode].url
  if (url.length === 0) {
    return ''
  }
  return padUrlHttps(url)
}

export const getKeycapType = (keyCode: string): KeycapType => {
  if (localConfig.bookmark.source !== 1) {
    // 来源自扩展
    if (!localConfig.bookmark.keymap[keyCode]) {
      return 'none'
    }
    const url = localConfig.bookmark.keymap[keyCode].url
    return url.length === 0 ? 'none' : 'mark'
  }
  // 来源自浏览器书签
  const targetIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
  if (targetIndex === 0) {
    // 第一个按键为返回
    return 'back'
  }
  const bookmarkItem = currFolderBookmarks.value[targetIndex - 1] || {}
  const isFolder = Object.prototype.hasOwnProperty.call(bookmarkItem, 'children')
  if (isFolder) {
    return 'folder'
  }
  if (bookmarkItem?.url) {
    return 'mark'
  }
  return 'none'
}

export const getKeycapName = (keyCode: string) => {
  if (localConfig.bookmark.source === 1) {
    const targetIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
    if (targetIndex === 0) {
      const folders = state.selectedFolderTitleStack.length
      return folders === 0 ? '' : state.selectedFolderTitleStack[folders - 1]
    }
    return currFolderBookmarks.value[targetIndex - 1]?.title || ''
  }
  return getBookmarkConfigName(keyCode)
}

export const getKeycapUrl = (keyCode: string) => {
  if (localConfig.bookmark.source === 1) {
    const targetIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
    const bookmarkItem = currFolderBookmarks.value[targetIndex - 1] || {}
    const isFolder = Object.prototype.hasOwnProperty.call(bookmarkItem, 'children')
    return isFolder ? '' : bookmarkItem?.url || ''
  }
  return getBookmarkConfigUrl(keyCode)
}

let delayResetTimer: NodeJS.Timeout

const delayResetPressKey = () => {
  clearTimeout(delayResetTimer)
  delayResetTimer = setTimeout(() => {
    state.currSelectKeyCode = ''
  }, 200)
}

export const openPage = (url: string, isBgOpen = false, isNewTabOpen = false) => {
  if (url.length === 0) {
    return
  }
  gaProxy('click', ['bookmark', 'openPage'])
  if (isBgOpen) {
    // 后台打开
    createTab(url, false)
    delayResetPressKey()
    return
  }
  if (isNewTabOpen || localConfig.bookmark.isNewTabOpen || !/http/.test(url)) {
    // 以新标签页打开，其中非http协议只能以新标签页打开
    createTab(url)
    delayResetPressKey()
    return
  }
  // 当前标签页打开
  state.isLoadPageLoading = true
  window.$loadingBar.start()
  window.location.href = url
}

export const handlePressKeycap = (keyCode: string) => {
  state.currSelectKeyCode = keyCode
  setTimeout(() => {
    state.currSelectKeyCode = ''
  }, 200)
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
  getBrowserBookmarkForKeyboard()
})

addVisibilityTask('bookmark', (hidden) => {
  if (hidden) {
    return
  }
  refreshBookmarkConfig()
  getBrowserBookmarkForKeyboard()
})

export const getCustomKeycapWidth = (code: string, addRatio = 0) => {
  let value = KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].size
  const customSize = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].size
  if (customSize) {
    value = customSize
  }
  value += addRatio
  const width = getStyleField(CNAME, 'keycapSize', 'vmin', value)
  return width
}
