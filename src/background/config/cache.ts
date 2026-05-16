/**
 * @module cache
 * @description Background 配置缓存 — SW 无法使用 Vue 响应式状态，采用启动时加载 + onChanged 自动更新模式。
 * @dependencies config/defaults.ts（默认值）、config/compress.ts（parseStoredData）
 * @consumers commands/registry.ts（execSwCommand 读取缓存）、messaging/port-manager.ts（层切换冷却检查）
 * @pitfalls
 *   - onChanged 监听器必须返回 Promise（见 pitfalls.md），否则 SW 回收会截断异步操作
 *   - 层切换冷却采用 isBuildingLayerKeymap 标志位防护：从 buildAndSaveLayerKeymap 开始到
 *     onChanged 完成期间始终为 true，不依赖具体耗时，无间隙
 *   - isBuildingLayerKeymap 通过 buildLayerKeymapComplete() 统一清除，避免多路径遗漏
 *   - SW 和 CS 各自独立解析 gzip 配置，不通过 SW 广播分发（postMessage 开销与 gzip 解压同量级）
 * @see docs/architecture/background-modules.md#config/cache-配置缓存
 */
import { defaultConfig, KEYBOARD_COMMAND_CONFIG } from '@/logic/config/defaults'
import { log } from '@/logic/utils/common'
import { parseStoredData } from '@/logic/config/compress'
import { SYSTEM_KEYMAP_STORAGE_KEY } from '@/logic/keyboard/keyboard-constants'

const CONFIG_LOAD_TIMEOUT_MS = 5000

// ── KeyboardBookmark 配置缓存 ─────────────────────────────────────────────

let cachedKeyboardBookmarkConfig = JSON.parse(
  JSON.stringify(defaultConfig.keyboardBookmark),
) as typeof defaultConfig.keyboardBookmark
cachedKeyboardBookmarkConfig.keymap = {}

let bookmarkConfigLoadingPromise: Promise<void> | null = null

// ── 书签层切换冷却 ──────────────────────────────────────────────────────────

/**
 * 层切换冷却控制，采用 isBuildingLayerKeymap 标志位防护。
 *
 * 问题背景：
 * buildAndSaveLayerKeymap() 是 async，内部 await parseBookmarkFolder() 会读取
 * chrome.bookmarks 树（可能数百 ms），之后才执行 chrome.storage.local.set()。
 * cachedSystemKeymap 的更新只在 onChanged 中完成。
 *
 * 从命令触发到 onChanged 之间（含整个异步解析期），cachedSystemKeymap 是旧的，
 * 书签快捷键必须被拦截。
 *
 * 防护机制：
 * isBuildingLayerKeymap 标志位从 buildAndSaveLayerKeymap 开始到
 * onChanged 完成期间始终为 true，不依赖具体耗时，无间隙。
 * 清除统一通过 buildLayerKeymapComplete() 函数，避免多路径遗漏。
 *
 * 异常安全：isBuildingLayerKeymap 通过 buildLayerKeymapComplete() 统一清除，
 * 该函数在两条路径调用：
 * - 成功路径：onChanged 中，storage 写入完成后调用。
 * - 非成功路径（层未配置提前返回、解析异常）：buildAndSaveLayerKeymap 中调用。
 *   这两种情况均不写入 storage、不触发 onChanged，必须自行清除，
 *   否则标志位永久为 true，所有书签快捷键被拦截。
 *
 * 超时保护说明：
 * chrome.bookmarks.getTree() 是浏览器内置 API，有内置超时机制。
 * SW 的 init-guard 也有 10s 超时兜底。即使极端情况下标志位未被清除，
 * 用户修改任意书签或切层到已配置的层都会触发 onChanged，自动清除标志位。
 */
let isBuildingLayerKeymap = false

export const markLayerKeymapBuilding = () => {
  isBuildingLayerKeymap = true
}

/**
 * 统一清除层构建标志位。
 * 在 onChanged 中（成功路径）和 buildAndSaveLayerKeymap 异常/提前返回（非成功路径）调用。
 */
export const buildLayerKeymapComplete = () => {
  isBuildingLayerKeymap = false
}

/**
 * 检查是否在层切换冷却期内（由 port-manager.ts 处理书签快捷键时调用）。
 */
export const isInLayerSwitchCooldown = () => {
  return isBuildingLayerKeymap
}

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
      cachedKeyboardBookmarkConfig = JSON.parse(
        JSON.stringify(defaultConfig.keyboardBookmark),
      )
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
      buildLayerKeymapComplete()
      log('System keymap updated from storage.local')
    } else {
      cachedSystemKeymap = {}
      buildLayerKeymapComplete()
      // 注意：isBuildingLayerKeymap 通过 buildLayerKeymapComplete() 统一清除：
      // 1. 此处：storage.local.set 成功写入时（keymap 已更新），清除标志位。
      // 2. buildAndSaveLayerKeymap 中的非成功路径（层未配置提前返回、解析异常）：
      //    不写入 storage、不触发 onChanged，必须在函数内自行清除。
      // 两者互不冲突，覆盖所有退出路径。
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

/**
 * 获取当前键盘书签层配置（供 commands/registry.ts 使用）。
 *
 * 为什么放在 cache.ts 而非 main.ts：
 * commands/registry.ts 被 main.ts 导入（用于 execSwCommand 分发），
 * 而 registry.ts 需要读取层配置。
 * 放在此模块可避免循环依赖。
 */
export const getCachedKeyboardBookmarkLayers = () => {
  const config = getCachedKeyboardBookmarkConfig()
  return config?.layers ?? []
}
