/**
 * Background 配置缓存模块
 *
 * Service Worker 无法使用 Vue 响应式状态，采用缓存模式：
 * 启动时读取一次配置到内存，后续通过 chrome.storage.onChanged 自动更新缓存。
 * 按键事件直读缓存（~0ms 响应），无需每次读取 storage + 解压。
 *
 * 架构说明：SW 和 CS 各自独立解析 gzip 配置，不通过 SW 广播分发。
 * 原因：gzip 解压极快（1~3ms），postMessage IPC 开销在同一量级，
 * 集中到 SW 反而增加耦合、丧失 CS 本地 fallback 能力。
 * 详见 docs/architecture/messaging.md「配置变更：CS 各自解析 vs SW 广播」。
 */
import { WIDGET_CONFIG } from '@/newtab/widgets/keyboardBookmark/config'
import { KEYBOARD_COMMAND_CONFIG } from '@/logic/globalShortcut/shortcut-command'
import { log } from '@/logic/util'
import { parseStoredData } from '@/logic/compress'
import { SYSTEM_KEYMAP_STORAGE_KEY } from '@/logic/keyboard/keyboard-constants'

const CONFIG_LOAD_TIMEOUT_MS = 5000

// ── KeyboardBookmark 配置缓存 ─────────────────────────────────────────────

let cachedKeyboardBookmarkConfig = JSON.parse(
  JSON.stringify(WIDGET_CONFIG),
) as typeof WIDGET_CONFIG
cachedKeyboardBookmarkConfig.keymap = {}

let bookmarkConfigLoadingPromise: Promise<void> | null = null

// ── 系统书签 keymap 缓存（source=1，来自 chrome.storage.local）─────────────

let cachedSystemKeymap: Record<string, TBookmarkEntry> = {}

// ── KeyboardCommand 配置缓存 ──────────────────────────────────────────────

let cachedKeyboardCommandConfig = JSON.parse(
  JSON.stringify(KEYBOARD_COMMAND_CONFIG),
) as typeof KEYBOARD_COMMAND_CONFIG
cachedKeyboardCommandConfig.keymap = {}

let commandConfigLoadingPromise: Promise<void> | null = null

// ── 监听配置变化，自动更新缓存 ─────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes, areaName) => {
  const promises: Promise<void>[] = []

  if (changes['naive-tab-keyboardBookmark']) {
    const raw = changes['naive-tab-keyboardBookmark'].newValue as string
    if (raw && raw.length > 0) {
      const p = parseStoredData(raw)
        .then((parsed) => {
          cachedKeyboardBookmarkConfig = parsed.data
          log('KeyboardBookmark config updated')
        })
        .catch((e) => {
          log('Update keyboardBookmark cache error', e)
        })
      promises.push(p)
    } else {
      cachedKeyboardBookmarkConfig = JSON.parse(JSON.stringify(WIDGET_CONFIG))
      cachedKeyboardBookmarkConfig.keymap = {}
      log('KeyboardBookmark config removed, reset to defaults')
    }
  }

  if (changes['naive-tab-keyboardCommand']) {
    const raw = changes['naive-tab-keyboardCommand'].newValue as string
    if (raw && raw.length > 0) {
      const p = parseStoredData(raw)
        .then((parsed) => {
          cachedKeyboardCommandConfig = parsed.data
          log('KeyboardCommand config updated')
        })
        .catch((e) => {
          log('Update keyboardCommand cache error', e)
        })
      promises.push(p)
    } else {
      cachedKeyboardCommandConfig = JSON.parse(
        JSON.stringify(KEYBOARD_COMMAND_CONFIG),
      )
      cachedKeyboardCommandConfig.keymap = {}
      log('KeyboardCommand config removed, reset to defaults')
    }
  }

  // source=1 的 keymap 存储在 local 区域
  if (areaName === 'local' && changes[SYSTEM_KEYMAP_STORAGE_KEY]) {
    const newKeymap = changes[SYSTEM_KEYMAP_STORAGE_KEY].newValue as
      | Record<string, TBookmarkEntry>
      | undefined
    if (newKeymap) {
      cachedSystemKeymap = newKeymap
      log('System keymap updated from storage.local')
    } else {
      cachedSystemKeymap = {}
      log('System keymap removed from storage.local')
    }
  }

  if (promises.length > 0) {
    return Promise.all(promises).then(() => undefined)
  }
})

// ── 加载并缓存 keyboardBookmark 配置 ──────────────────────────────────────

export const loadAndCacheKeyboardBookmarkConfig = (): Promise<void> => {
  if (bookmarkConfigLoadingPromise) {
    return bookmarkConfigLoadingPromise
  }
  bookmarkConfigLoadingPromise = (async () => {
    let timeoutTimer: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutTimer = setTimeout(
        () => reject(new Error('Load keyboardBookmark config timeout')),
        CONFIG_LOAD_TIMEOUT_MS,
      )
    })

    try {
      await Promise.race([
        chrome.storage.sync
          .get('naive-tab-keyboardBookmark')
          .then(async (data) => {
            const raw = data['naive-tab-keyboardBookmark'] as string
            if (raw && raw.length > 0) {
              const parsed = await parseStoredData(raw)
              cachedKeyboardBookmarkConfig = parsed.data
              log('KeyboardBookmark config cached')
            } else {
              log('No keyboardBookmark config in storage, using defaults')
            }
          }),
        timeoutPromise,
      ])
    } catch (e) {
      log('Load keyboardBookmark config error', e)
    } finally {
      clearTimeout(timeoutTimer!)
      bookmarkConfigLoadingPromise = null
    }
  })()
  return bookmarkConfigLoadingPromise
}

// ── 加载 system keymap（source=1，来自 chrome.storage.local）─────────────

export const loadAndCacheSystemKeymap = async (): Promise<void> => {
  try {
    const data = await chrome.storage.local.get(SYSTEM_KEYMAP_STORAGE_KEY)
    const keymap = data[SYSTEM_KEYMAP_STORAGE_KEY] as
      | Record<string, TBookmarkEntry>
      | undefined
    if (keymap) {
      cachedSystemKeymap = keymap
      log('System keymap loaded from storage.local')
    }
  } catch (e) {
    log('Load system keymap error', e)
  }
}

// ── 加载并缓存 keyboardCommand 配置 ───────────────────────────────────────

export const loadAndCacheKeyboardCommandConfig = (): Promise<void> => {
  if (commandConfigLoadingPromise) {
    return commandConfigLoadingPromise
  }
  commandConfigLoadingPromise = (async () => {
    let timeoutTimer: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutTimer = setTimeout(
        () => reject(new Error('Load keyboardCommand config timeout')),
        CONFIG_LOAD_TIMEOUT_MS,
      )
    })

    try {
      await Promise.race([
        chrome.storage.sync
          .get('naive-tab-keyboardCommand')
          .then(async (data) => {
            const raw = data['naive-tab-keyboardCommand'] as string
            if (raw && raw.length > 0) {
              const parsed = await parseStoredData(raw)
              cachedKeyboardCommandConfig = parsed.data
              log('KeyboardCommand config cached')
            } else {
              log('No keyboardCommand config in storage, using defaults')
            }
          }),
        timeoutPromise,
      ])
    } catch (e) {
      log('Load keyboardCommand config error', e)
    } finally {
      clearTimeout(timeoutTimer!)
      commandConfigLoadingPromise = null
    }
  })()
  return commandConfigLoadingPromise
}

// ── 读取缓存（供外部调用） ─────────────────────────────────────────────────

export const getCachedKeyboardBookmarkConfig = () =>
  cachedKeyboardBookmarkConfig
export const getCachedKeyboardCommandConfig = () => cachedKeyboardCommandConfig
export const getCachedSystemKeymap = () => cachedSystemKeymap
