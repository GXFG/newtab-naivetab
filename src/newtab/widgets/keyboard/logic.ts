import { gaProxy } from '@/logic/gtag'
import { requestPermission } from '@/logic/storage'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { createTab, padUrlHttps, log } from '@/logic/util'
import { defaultConfig } from '@/logic/config'
import { addVisibilityTask, addPageFocusTask } from '@/logic/task'
import { getBrowserBookmark } from '@/logic/bookmark'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG } from '@/logic/constants/keyboard'
import { currKeyboardConfig, keyboardCurrentModelAllKeyList } from '@/logic/keyboard'
import { globalState, localConfig, getAllCommandsConfig, getStyleField } from '@/logic/store'
import { WIDGET_CODE } from './config'

export const state = reactive({
  systemBookmarks: [] as BookmarkNode[],
  selectedFolderTitleStack: [] as string[],
  isLoadPageLoading: false,
  currSelectKeyCode: '',
})

export const getSystemBookmarkForKeyboard = async () => {
  if (localConfig.keyboard.source !== 1) return
  try {
    const base = await getBrowserBookmark()
    state.systemBookmarks = base
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
        if (!granted) return
        getSystemBookmarkForKeyboard()
      },
      onNegativeClick: () => {
        localConfig.keyboard.source = 2
      },
    })
  }
}

export const initKeyboardData = () => {
  getSystemBookmarkForKeyboard()
  state.selectedFolderTitleStack = localConfig.keyboard.defaultExpandFolder ? [localConfig.keyboard.defaultExpandFolder] : []
}

export const getDefaultBookmarkNameFromUrl = (url: string) => {
  if (!url) return ''
  const padUrl = padUrlHttps(url)
  const domain = padUrl.split('/')[2]
  if (!domain) return ''
  if (domain.includes(':')) return `:${domain.split(':')[1]}`
  const tempSplitList = domain.split('.')
  return tempSplitList.includes('www') ? tempSplitList[1] : tempSplitList[0]
}

const findTargetFolderBookmark = (folderBookmark: BookmarkNode[], folderTitleStack: string[]) => {
  try {
    if (folderTitleStack.length === 0) return folderBookmark
    const targetFolder = folderBookmark.find((item) => item.title === folderTitleStack[0])?.children as BookmarkNode[]
    return findTargetFolderBookmark(targetFolder, folderTitleStack.slice(1))
  } catch (e) {
    console.error(e)
    return []
  }
}

export const currFolderBookmarks = computed(() => {
  if (state.systemBookmarks.length === 0) return []
  if (state.selectedFolderTitleStack.length === 0) return state.systemBookmarks
  return findTargetFolderBookmark(state.systemBookmarks, state.selectedFolderTitleStack) || []
})

export const handleSpecialKeycapExec = (keyCode: string, keycapType: KeycapType) => {
  if (keycapType === 'folder') {
    const targetKeyIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
    const bookmarkItem = currFolderBookmarks.value[targetKeyIndex - 1] || {}
    state.selectedFolderTitleStack.push((bookmarkItem as any).title)
    return true
  }
  if (keycapType === 'back') {
    state.selectedFolderTitleStack.pop()
    return true
  }
  return false
}

export const getBookmarkConfigName = (keyCode: string) => {
  if (!localConfig.keyboard.keymap[keyCode]) {
    return ''
  }
  return (localConfig.keyboard.keymap[keyCode].name as string) || getDefaultBookmarkNameFromUrl(localConfig.keyboard.keymap[keyCode].url)
}

export const getBookmarkConfigUrl = (keyCode: string) => {
  if (!localConfig.keyboard.keymap[keyCode]) {
    return ''
  }
  const url = localConfig.keyboard.keymap[keyCode].url
  if (url.length === 0) {
    return ''
  }
  return padUrlHttps(url)
}

export const getKeycapType = (keyCode: string): KeycapType => {
  if (localConfig.keyboard.source !== 1) {
    if (!localConfig.keyboard.keymap[keyCode]) return 'none'
    const url = localConfig.keyboard.keymap[keyCode].url
    return url.length === 0 ? 'none' : 'mark'
  }
  const targetIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
  if (targetIndex === 0) return 'back'
  const bookmarkItem = currFolderBookmarks.value[targetIndex - 1] || {}
  const isFolder = Object.prototype.hasOwnProperty.call(bookmarkItem, 'children')
  if (isFolder) return 'folder'
  if ((bookmarkItem as any)?.url) return 'mark'
  return 'none'
}

export const getKeycapName = (keyCode: string) => {
  if (localConfig.keyboard.source === 1) {
    const targetIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
    if (targetIndex === 0) {
      const folders = state.selectedFolderTitleStack.length
      return folders === 0 ? '' : state.selectedFolderTitleStack[folders - 1]
    }
    return (currFolderBookmarks.value[targetIndex - 1] as any)?.title || ''
  }
  return getBookmarkConfigName(keyCode)
}

export const getKeycapUrl = (keyCode: string) => {
  if (localConfig.keyboard.source === 1) {
    const targetIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
    const bookmarkItem = currFolderBookmarks.value[targetIndex - 1] || {}
    const isFolder = Object.prototype.hasOwnProperty.call(bookmarkItem, 'children')
    return isFolder ? '' : (bookmarkItem as any)?.url || ''
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
  if (url.length === 0) return
  gaProxy('click', ['keyboard', 'openPage'])
  if (isBgOpen) {
    createTab(url, false)
    delayResetPressKey()
    return
  }
  if (isNewTabOpen || localConfig.keyboard.isNewTabOpen || !/http/.test(url)) {
    createTab(url)
    delayResetPressKey()
    return
  }
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

export const resetKeyboardPending = () => {
  localStorage.setItem('data-keyboard-pending', JSON.stringify({ isPending: false }))
}

const refreshKeyboardConfig = () => {
  if (globalState.isSettingDrawerVisible) {
    getAllCommandsConfig()
  }
  const bookmarkPendingData = useStorageLocal('data-keyboard-pending', { isPending: false })
  if (!bookmarkPendingData.value.isPending) return
  log('Update keyboard from popup')
  localConfig.keyboard = useStorageLocal('c-keyboard', defaultConfig.keyboard) as any
  resetKeyboardPending()
}

addPageFocusTask('keyboard', () => {
  refreshKeyboardConfig()
  getSystemBookmarkForKeyboard()
})

addVisibilityTask('keyboard', (hidden) => {
  if (hidden) return
  refreshKeyboardConfig()
  getSystemBookmarkForKeyboard()
})

export const getCustomKeycapWidth = (code: string, addRatio = 0) => {
  let value = KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].size
  const customSize = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].size
  if (customSize) value = customSize
  value += addRatio
  const width = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', value)
  return width
}
