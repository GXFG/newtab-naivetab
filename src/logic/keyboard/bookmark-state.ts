/**
 * @module keyboard/bookmark-state
 * @description 键盘书签共享状态管理层。从原始 logic.ts 提取，供 newtab / popup /
 *   setting / components 跨层消费。包含：系统书签获取、初始化、层切换、数据刷新。
 *   不依赖任何 UI Widget 或 Vue 组件。
 * @dependencies bookmark/api.ts（getBrowserBookmark）、bookmark/parser.ts（解析）、
 *   keyboard/keyboard-layout.ts（键盘布局）、keyboard/keyboard-constants.ts（常量）
 * @consumers widgets/keyboardBookmark/logic.ts、components/BaseNaiveBookmarkManager.vue、
 *   components/BaseSystemBookmarkManager.vue、components/BaseBookmarkLayerTabSwitcher.vue
 * @see docs/features/bookmark.md
 */
import { ref, reactive, computed } from 'vue'
import { requestPermission, checkPermission } from '@/logic/utils/permission'
import { padUrlHttps } from '@/logic/utils/common'
import { addVisibilityTask, addPageFocusTask } from '@/logic/task'
import { getBrowserBookmark } from '@/logic/bookmark/api'
import { parseBookmarkFolder, extractDomainName } from '@/logic/bookmark/parser'
import { keyboardCurrentModelAllKeyList } from '@/logic/keyboard/keyboard-layout'
import { localConfig } from '@/logic/config/state'
import {
  SYSTEM_KEYMAP_STORAGE_KEY,
  DEFAULT_LAYER_SOURCE_FOLDER,
  ACTIVE_LAYER_STORAGE_KEY,
} from '@/logic/keyboard/keyboard-constants'
import { BookmarkSource } from '@/common/widget-constants'
import { MSG_SWITCH_BOOKMARK_LAYER_UI } from '@/types/messages'

/**
 * 监听 popup 等上下文对 systemKeymap 的修改，实时同步状态。
 *
 * 场景：popup 中修改浏览器书签绑定/顺序后，写入 chrome.storage.local，
 * 此监听器自动更新 state.systemKeymap，无需刷新页面。
 *
 * 注意：此监听器不返回 Promise，因为运行在 newtab 页面上下文
 * （非 Service Worker），不需要通过返回值阻止页面休眠。
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

  // 书签层切换（用户手动或来自其他标签页）
  // 注意：统一由 SW 原子写入后，SYSTEM_KEYMAP_STORAGE_KEY 的 handler 会更新
  // state.systemKeymap。此处只需更新 cachedActiveLayer 视觉指示器，
  // 不再调用 getSystemBookmarkForKeyboard()（避免重复解析书签树）。
  if (areaName === 'local' && changes[ACTIVE_LAYER_STORAGE_KEY]) {
    const newLayer = changes[ACTIVE_LAYER_STORAGE_KEY].newValue as
      | number
      | undefined
    if (typeof newLayer === 'number') {
      cachedActiveLayer.value = newLayer
    }
  }
})

/** 当前激活层索引（响应式 ref，确保异步加载后 Vue 组件自动更新） */
export const cachedActiveLayer = ref(0)

/** 初始化时从 chrome.storage.local 加载 */
export const loadActiveLayer = async () => {
  const stored = await chrome.storage.local.get(ACTIVE_LAYER_STORAGE_KEY)
  if (typeof stored[ACTIVE_LAYER_STORAGE_KEY] === 'number') {
    cachedActiveLayer.value = stored[ACTIVE_LAYER_STORAGE_KEY]
  }
}

/** 获取当前激活层的文件夹名称 */
export const getCurrentLayerFolderTitle = (): string => {
  const { layers } = localConfig.keyboardBookmark
  if (layers?.[cachedActiveLayer.value]?.sourceFolderPath) {
    return layers[cachedActiveLayer.value].sourceFolderPath
  }
  return DEFAULT_LAYER_SOURCE_FOLDER
}

export const state = reactive({
  systemBookmarks: [] as BookmarkNode[],
  isLoadPageLoading: false,
  currSelectKeyCode: '',
  /** 系统书签解析出的 keymap（仅内存，不持久化到 localConfig）*/
  systemKeymap: {} as Record<string, TBookmarkEntry>,
})

export const getSystemBookmarkForKeyboard = async () => {
  if (localConfig.keyboardBookmark.source !== BookmarkSource.BROWSER) {
    return
  }
  try {
    const granted = await checkPermission('bookmarks')
    if (!granted) {
      throw new Error('bookmarks permission not granted')
    }

    const sourceFolderPath = getCurrentLayerFolderTitle()

    const base = await getBrowserBookmark()
    state.systemBookmarks = base

    const result = await parseBookmarkFolder(
      sourceFolderPath,
      keyboardCurrentModelAllKeyList.value,
    )

    state.systemKeymap = Object.fromEntries(
      result.entries.map((e) => [e.code, { url: e.url, name: e.name }]),
    )

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
        localConfig.keyboardBookmark.source = BookmarkSource.INTERNAL
      },
    })
  }
}

export const initKeyboardData = async () => {
  await loadActiveLayer()
  getSystemBookmarkForKeyboard()
}

/**
 * 切换到指定层（0-3）
 *
 * 通过 runtime.sendMessage 通知 SW 执行原子写入（keymap + activeLayer 一次 set），
 * 避免两步写入的中间状态。SW 在 port-manager.ts 中处理 MSG_SWITCH_BOOKMARK_LAYER_UI。
 *
 * 数据流：UI 发消息 → SW 解析书签树 → 原子写入 storage → 各端 onChanged 同步。
 */
export const switchLayer = async (layerIndex: number): Promise<void> => {
  const { layers } = localConfig.keyboardBookmark
  if (!layers?.[layerIndex]?.sourceFolderPath) {
    console.warn(`[keyboardBookmark] Layer ${layerIndex} is not configured`)
    return
  }

  chrome.runtime.sendMessage({
    type: MSG_SWITCH_BOOKMARK_LAYER_UI,
    layerIndex,
  })
}

/**
 * 从 URL 提取域名作为默认书签名称。
 */
export const getDefaultBookmarkNameFromUrl = extractDomainName

export const activeKeymap = computed(() => {
  if (localConfig.keyboardBookmark.source === BookmarkSource.BROWSER) {
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

/**
 * 页面获得焦点/可见时刷新键盘相关数据
 */
const refreshKeyboardData = () => {
  getSystemBookmarkForKeyboard()
}

addPageFocusTask('keyboardBookmark', refreshKeyboardData)

addVisibilityTask('keyboardBookmark', (hidden) => {
  if (hidden) return
  refreshKeyboardData()
})
