/**
 * Background Service Worker 启动编排
 *
 * 管理配置加载完成后才允许快捷键处理的状态守卫。
 * `waitInitialized()` 等待 keyboardBookmark + keyboardCommand + systemKeymap
 * 三个配置都加载完成后标记 `isInitialized = true`，防止冷启动期间读到空 keymap。
 */

import {
  loadAndCacheKeyboardBookmarkConfig,
  loadAndCacheKeyboardCommandConfig,
  loadAndCacheSystemKeymap,
} from './cache'

const INIT_TIMEOUT_MS = 10000

let isInitialized = false
let initPromise: Promise<void> | null = null

export const waitInitialized = (): Promise<void> => {
  if (isInitialized) return Promise.resolve()
  if (initPromise) return initPromise
  initPromise = Promise.all([
    loadAndCacheKeyboardBookmarkConfig(),
    loadAndCacheKeyboardCommandConfig(),
    loadAndCacheSystemKeymap(),
  ])
    .then(() => {
      isInitialized = true
      initPromise = null
    })
    .catch(() => {
      // 超时或解析异常也标记为完成，避免永久阻塞快捷键
      isInitialized = true
      initPromise = null
    })

  // 超时兜底
  setTimeout(() => {
    if (!isInitialized) {
      isInitialized = true
      initPromise = null
    }
  }, INIT_TIMEOUT_MS)

  return initPromise
}

export const getIsInitialized = () => isInitialized
