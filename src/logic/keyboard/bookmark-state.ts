/**
 * @module keyboard/bookmark-state
 * @description 键盘书签共享状态管理层。从原始 logic.ts 提取，供 newtab / popup /
 *   setting / components 跨层消费。包含：系统书签获取、初始化、层切换、数据刷新。
 *   不依赖任何 UI Widget 或 Vue 组件。
 * @dependencies bookmark/api.ts（getBrowserBookmark）、bookmark/parser.ts（解析）、
 *   bookmark/bookmark-export.ts（首次安装自动创建书签层）、
 *   keyboard/keyboard-layout.ts（键盘布局）、keyboard/keyboard-constants.ts（常量）
 * @consumers widgets/keyboardBookmark/logic.ts、components/BaseNaiveBookmarkManager.vue、
 *   components/BaseSystemBookmarkManager.vue、components/BaseBookmarkLayerTabSwitcher.vue
 * @see docs/features/bookmark.md
 */
import { ref, reactive, computed } from 'vue'
import {
  createLayerBookmarkFolders,
  exportKeymapToBrowser,
} from '@/logic/keyboard/bookmark-export'
import { padUrlHttps } from '@/logic/utils/common'
import { addVisibilityTask, addPageFocusTask } from '@/logic/task'
import { getBrowserBookmark } from '@/logic/bookmark/api'
import {
  parseBookmarkFolder,
  extractDomainName,
  findFolderByPath,
} from '@/logic/bookmark/parser'
import { keyboardCurrentModelAllKeyList } from '@/logic/keyboard/keyboard-layout'
import { localConfig } from '@/logic/config/state'
import {
  SYSTEM_KEYMAP_STORAGE_KEY,
  DEFAULT_LAYER_SOURCE_FOLDER,
  ACTIVE_LAYER_STORAGE_KEY,
  KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER,
} from '@/logic/keyboard/keyboard-constants'
import { BookmarkSource, LAYER_FOLDER_NAMES } from '@/common/widget-constants'
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
      persistKeymapToLocal(newKeymap)
    } else {
      state.systemKeymap = {}
      persistKeymapToLocal({})
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
      try {
        localStorage.setItem(ACTIVE_LAYER_STORAGE_KEY, String(newLayer))
      } catch {
        /* localStorage 写入失败，静默降级 */
      }
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
  /** 系统书签解析出的 keymap。内存 state + localStorage 缓存（首屏同步读取）+ chrome.storage.local 持久化（跨上下文共享） */
  systemKeymap: {} as Record<string, TBookmarkEntry>,
})

// 模块加载时从 localStorage 同步恢复缓存，确保组件首次渲染即有数据。
// localConfig 已通过 useStorageLocal 同步就绪（source=BROWSER），activeKeymap
// 在首次渲染时直接取 state.systemKeymap，不能等异步 chrome.storage.local.get。
try {
  const cached = localStorage.getItem(SYSTEM_KEYMAP_STORAGE_KEY)
  if (cached) {
    state.systemKeymap = JSON.parse(cached)
  }
} catch {
  /* localStorage 读取失败，静默降级 */
}

try {
  const cached = localStorage.getItem(ACTIVE_LAYER_STORAGE_KEY)
  if (cached !== null) {
    cachedActiveLayer.value = JSON.parse(cached)
  }
} catch {
  /* localStorage 读取失败，静默降级 */
}

/** 将 systemKeymap 持久化到 localStorage，供下次模块加载同步读取 */
const persistKeymapToLocal = (keymap: Record<string, TBookmarkEntry>) => {
  try {
    localStorage.setItem(SYSTEM_KEYMAP_STORAGE_KEY, JSON.stringify(keymap))
  } catch {
    /* localStorage 读取失败，静默降级 */
  }
}

export const getSystemBookmarkForKeyboard = async () => {
  if (localConfig.keyboardBookmark.source !== BookmarkSource.BROWSER) {
    return
  }
  try {
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
    persistKeymapToLocal(state.systemKeymap)
  } catch (e) {
    console.warn(e)
    // bookmarks 为必需权限，安装时已授予，不可能因权限问题走到这里。
    // 异常原因可能是书签树解析失败、API 异常等，
    // 静默降级到 INTERNAL 模式，与 initFirstOpenBookmarkLayers 行为一致。
    localConfig.keyboardBookmark.source = BookmarkSource.INTERNAL
  }
}

export const initKeyboardData = async () => {
  await loadActiveLayer()
  await initFirstOpenBookmarkLayers()
  getSystemBookmarkForKeyboard()
}

/**
 * 首次安装时自动创建书签层文件夹并导出默认书签到浏览器书签栏。
 * 仅在 isFirstOpen && source === BROWSER 时执行。
 * bookmarks API 异常时回退到 INTERNAL 模式（bookmarks 为必需权限，安装时已授予）。
 */
const initFirstOpenBookmarkLayers = async (): Promise<void> => {
  if (!localConfig.general.isFirstOpen) return
  if (localConfig.keyboardBookmark.source !== BookmarkSource.BROWSER) return

  try {
    const tree = await chrome.bookmarks.getTree()
    const topFolder = findFolderByPath(tree, KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER)

    // 已有 NaiveTab 文件夹（如重装场景），跳过创建和导出，仅回填 sourceFolderPath
    // 确保层切换正常工作（getCurrentLayerFolderTitle 的 fallback 仅适用于 layer1）
    if (topFolder) {
      LAYER_FOLDER_NAMES.forEach((name, i) => {
        if (localConfig.keyboardBookmark.layers[i]) {
          localConfig.keyboardBookmark.layers[i].sourceFolderPath =
            `${KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER}/${name}`
        }
      })
      return
    }

    // 全新用户：创建文件夹 → 回填路径 → 导出默认书签
    const paths = await createLayerBookmarkFolders()
    paths.forEach((path, i) => {
      if (localConfig.keyboardBookmark.layers[i]) {
        localConfig.keyboardBookmark.layers[i].sourceFolderPath = path
      }
    })
    await exportKeymapToBrowser(localConfig.keyboardBookmark.keymap)
  } catch (e) {
    console.warn('[keyboardBookmark] First-open layer init failed:', e)
    localConfig.keyboardBookmark.source = BookmarkSource.INTERNAL
  }
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

  // 乐观更新：立即更新本地状态，UI 瞬间响应，不等 SW 异步回调
  cachedActiveLayer.value = layerIndex
  try {
    localStorage.setItem(ACTIVE_LAYER_STORAGE_KEY, String(layerIndex))
  } catch {
    /* localStorage 读取失败，静默降级 */
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
