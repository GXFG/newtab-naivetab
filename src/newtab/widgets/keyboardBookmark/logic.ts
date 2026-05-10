import { gaProxy } from '@/logic/gtag'
import { requestPermission, checkPermission } from '@/logic/permission'
import { createTab, padUrlHttps } from '@/logic/util'
import { addVisibilityTask, addPageFocusTask } from '@/logic/task'
import { getBrowserBookmark } from '@/logic/bookmark'
import { parseBookmarkFolder } from '@/logic/keyboard/bookmark-parser'
import { keyboardCurrentModelAllKeyList } from '@/logic/keyboard/keyboard-layout'
import { localConfig } from '@/logic/store'
import {
  KEYCAP_ACTIVE_DURATION,
  SYSTEM_KEYMAP_STORAGE_KEY,
} from '@/logic/keyboard/keyboard-constants'

/**
 * 监听 popup 等上下文对 systemKeymap 的修改，实时同步到 newtab 页面。
 *
 * 场景：popup 中修改浏览器书签绑定/顺序后，写入 chrome.storage.local，
 * newtab 通过此监听器自动更新 state.systemKeymap，无需刷新页面。
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[SYSTEM_KEYMAP_STORAGE_KEY]) {
    const newKeymap = changes[SYSTEM_KEYMAP_STORAGE_KEY].newValue as
      | Record<string, TBookmarkEntry>
      | undefined
    if (newKeymap) {
      state.systemKeymap = newKeymap
    } else {
      state.systemKeymap = {}
    }
  }
})

/** 当前激活层索引（响应式 ref，确保异步加载后 Vue 组件自动更新） */
export const cachedActiveLayer = ref(0)

/** 初始化时从 chrome.storage.local 加载 */
export const loadActiveLayer = async () => {
  const stored = await chrome.storage.local.get('naive-tab-activeLayer')
  if (typeof stored['naive-tab-activeLayer'] === 'number') {
    cachedActiveLayer.value = stored['naive-tab-activeLayer']
  }
}

/** 获取当前激活层的文件夹名称 */
export const getCurrentLayerFolderTitle = (): string => {
  const { layers } = localConfig.keyboardBookmark
  if (layers?.[cachedActiveLayer.value]?.sourceFolderTitle) {
    return layers[cachedActiveLayer.value].sourceFolderTitle
  }
  return 'NaiveTab'
}

export const state = reactive({
  systemBookmarks: [] as BookmarkNode[],
  selectedFolderTitleStack: [] as string[],
  isLoadPageLoading: false,
  currSelectKeyCode: '',
  /** 系统书签解析出的 keymap（仅内存，不持久化到 localConfig）*/
  systemKeymap: {} as Record<string, TBookmarkEntry>,
})

export const getSystemBookmarkForKeyboard = async () => {
  if (localConfig.keyboardBookmark.source !== 1) {
    return
  }
  try {
    // 静默检查已有权限（不触发弹框），避免页面刷新时因缺少用户手势返回 false 导致 source 被重置
    const granted = await checkPermission('bookmarks')
    if (!granted) {
      throw new Error('bookmarks permission not granted')
    }

    const sourceFolderTitle = getCurrentLayerFolderTitle()
    const bindingMode = localConfig.keyboardBookmark.bindingMode

    // 始终加载完整书签树，用于文件夹导航和 Setting 面板下拉列表
    const base = await getBrowserBookmark()
    state.systemBookmarks = base

    if (bindingMode) {
      // 键位绑定：解析 [X] 前缀书签，构建 keymap + Widget 数据
      const result = await parseBookmarkFolder(
        sourceFolderTitle,
        keyboardCurrentModelAllKeyList.value,
        { bindingMode: true },
      )

      // 同步 系统书签 keymap（仅内存），不污染 source=2 用户托管 keymap
      state.systemKeymap = Object.fromEntries(
        result.entries.map((e) => [e.code, { url: e.url, name: e.name }]),
      )
    } else {
      // 顺序模式：同时构建 keymap（按遍历顺序填充），写入 系统书签 keymap
      const result = await parseBookmarkFolder(
        sourceFolderTitle,
        keyboardCurrentModelAllKeyList.value,
        { bindingMode: false },
      )
      state.systemKeymap = Object.fromEntries(
        result.entries.map((e) => [e.code, { url: e.url, name: e.name }]),
      )
    }

    // 将解析出的 keymap 写入 chrome.storage.local，供 CS/SW 跨上下文使用
    // chrome.storage.local 不触发云同步，且所有上下文（newtab/CS/SW）均可访问
    chrome.storage.local.set({
      [SYSTEM_KEYMAP_STORAGE_KEY]: state.systemKeymap,
    })
  } catch (e) {
    console.warn(e)
    window.$dialog.create({
      title: window.$t('common.confirm'),
      content: window.$t('browserPermission.bookmark'),
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
        localConfig.keyboardBookmark.source = 2
      },
    })
  }
}

export const initKeyboardData = async () => {
  await loadActiveLayer()
  getSystemBookmarkForKeyboard()
  state.selectedFolderTitleStack = localConfig.keyboardBookmark
    .defaultExpandFolder
    ? [localConfig.keyboardBookmark.defaultExpandFolder]
    : []
}

/**
 * 切换到指定层（0-3）
 */
export const switchLayer = async (layerIndex: number): Promise<void> => {
  const { layers } = localConfig.keyboardBookmark
  if (!layers?.[layerIndex]?.sourceFolderTitle) {
    console.warn(`[keyboardBookmark] Layer ${layerIndex} is not configured`)
    return
  }

  cachedActiveLayer.value = layerIndex

  // 持久化到 chrome.storage.local（不触发云同步）
  await chrome.storage.local.set({
    'naive-tab-activeLayer': layerIndex,
  })

  // 清空文件夹导航栈
  state.selectedFolderTitleStack = []

  // 重新加载书签数据
  await getSystemBookmarkForKeyboard()
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

const findTargetFolderBookmark = (
  folderBookmark: BookmarkNode[],
  folderTitleStack: string[],
) => {
  try {
    if (folderTitleStack.length === 0) return folderBookmark
    const targetFolder = folderBookmark.find(
      (item) => item.title === folderTitleStack[0],
    )?.children as BookmarkNode[]
    return findTargetFolderBookmark(targetFolder, folderTitleStack.slice(1))
  } catch (e) {
    console.error(e)
    return []
  }
}

export const currFolderBookmarks = computed(() => {
  if (state.systemBookmarks.length === 0) return []
  if (state.selectedFolderTitleStack.length === 0) return state.systemBookmarks
  return (
    findTargetFolderBookmark(
      state.systemBookmarks,
      state.selectedFolderTitleStack,
    ) || []
  )
})

export const handleSpecialKeycapExec = (
  keyCode: string,
  keycapBookmarkType: KeycapBookmarkType,
) => {
  if (keycapBookmarkType === 'folder') {
    const targetKeyIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
    const bookmarkItem = currFolderBookmarks.value[targetKeyIndex - 1] || {}
    state.selectedFolderTitleStack.push((bookmarkItem as any).title)
    return true
  }
  if (keycapBookmarkType === 'back') {
    state.selectedFolderTitleStack.pop()
    return true
  }
  return false
}

export const activeKeymap = computed(() => {
  if (localConfig.keyboardBookmark.source === 1) {
    return state.systemKeymap
  }
  return localConfig.keyboardBookmark.keymap
})

export const getBookmarkConfigName = (keyCode: string) => {
  const km = activeKeymap.value
  if (!km[keyCode]) {
    return ''
  }
  return (
    (km[keyCode].name as string) ||
    getDefaultBookmarkNameFromUrl(km[keyCode].url)
  )
}

export const getBookmarkConfigUrl = (keyCode: string) => {
  const km = activeKeymap.value
  if (!km[keyCode]) {
    return ''
  }
  const url = km[keyCode].url
  if (url.length === 0) {
    return ''
  }
  return padUrlHttps(url)
}

export const getKeycapBookmarkType = (keyCode: string): KeycapBookmarkType => {
  if (localConfig.keyboardBookmark.source !== 1) {
    if (!localConfig.keyboardBookmark.keymap[keyCode]) return 'none'
    const url = localConfig.keyboardBookmark.keymap[keyCode].url
    return url.length === 0 ? 'none' : 'mark'
  }

  // 系统书签：走 systemKeymap
  if (localConfig.keyboardBookmark.bindingMode) {
    if (!state.systemKeymap[keyCode]) return 'none'
    const url = state.systemKeymap[keyCode].url
    return url.length === 0 ? 'none' : 'mark'
  }

  // 顺序模式：走书签树索引映射
  const targetIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
  if (targetIndex === 0) return 'back'
  const bookmarkItem = currFolderBookmarks.value[targetIndex - 1] || {}
  const isFolder = Object.prototype.hasOwnProperty.call(
    bookmarkItem,
    'children',
  )
  if (isFolder) return 'folder'
  if ((bookmarkItem as any)?.url) return 'mark'
  return 'none'
}

export const getKeycapName = (keyCode: string) => {
  if (localConfig.keyboardBookmark.source === 1) {
    // 键位绑定：走 keymap
    if (localConfig.keyboardBookmark.bindingMode) {
      return getBookmarkConfigName(keyCode)
    }
    // 顺序模式：走书签树索引映射
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
  if (localConfig.keyboardBookmark.source === 1) {
    // 键位绑定：走 keymap
    if (localConfig.keyboardBookmark.bindingMode) {
      return getBookmarkConfigUrl(keyCode)
    }
    // 顺序模式：走书签树索引映射
    const targetIndex = keyboardCurrentModelAllKeyList.value.indexOf(keyCode)
    const bookmarkItem = currFolderBookmarks.value[targetIndex - 1] || {}
    const isFolder = Object.prototype.hasOwnProperty.call(
      bookmarkItem,
      'children',
    )
    return isFolder ? '' : (bookmarkItem as any)?.url || ''
  }
  return getBookmarkConfigUrl(keyCode)
}

let delayResetTimer: NodeJS.Timeout
const delayResetPressKey = () => {
  clearTimeout(delayResetTimer)
  delayResetTimer = setTimeout(() => {
    state.currSelectKeyCode = ''
  }, KEYCAP_ACTIVE_DURATION)
}

export const openPage = (
  url: string,
  isBgOpen = false,
  isNewTabOpen = false,
) => {
  if (url.length === 0) return
  gaProxy('click', ['keyboardBookmark', 'openPage'])
  if (isBgOpen) {
    createTab(url, false)
    delayResetPressKey()
    return
  }
  if (
    isNewTabOpen ||
    localConfig.keyboardBookmark.isNewTabOpen ||
    !/http/.test(url)
  ) {
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
  }, KEYCAP_ACTIVE_DURATION)
}

/**
 * 页面获得焦点/可见时刷新键盘相关数据
 * - 系统书签：用户可能在其他页面修改了书签树
 * - keyboard 配置：由 setupKeyboardSyncListener 实时同步，无需在此处理
 */
const refreshKeyboardData = () => {
  getSystemBookmarkForKeyboard()
}

addPageFocusTask('keyboardBookmark', refreshKeyboardData)

addVisibilityTask('keyboardBookmark', (hidden) => {
  if (hidden) return
  refreshKeyboardData()
})
