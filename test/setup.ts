/**
 * Vitest 全局测试环境初始化
 *
 * 职责：
 * 1. Mock Chrome Extension API（chrome.storage / chrome.tabs / chrome.runtime 等）
 * 2. 注入 window.$t / $message / $notification 等全局 API
 * 3. Polyfill CompressionStream / DecompressionStream
 * 4. 每个测试前清空 localStorage
 */

import { beforeEach, vi } from 'vitest'
import { CompressionStream, DecompressionStream } from 'node:stream/web'

// ── Chrome Extension API Mock ──

// chrome.storage.sync 模拟数据
const mockSyncData: Record<string, unknown> = {}

const chromeMock = {
  storage: {
    sync: {
      get: vi.fn((keys, callback) => {
        if (typeof keys === 'string' && callback === undefined) {
          // Promise form: return Promise
          return Promise.resolve({ [keys]: mockSyncData[keys] })
        }
        if (keys === null) {
          callback({ ...mockSyncData })
        } else if (typeof keys === 'string') {
          callback({ [keys]: mockSyncData[keys] })
        } else {
          const result: Record<string, unknown> = {}
          for (const key of keys) {
            result[key] = mockSyncData[key]
          }
          callback(result)
        }
      }),
      set: vi.fn((obj, callback) => {
        Object.assign(mockSyncData, obj)
        callback?.()
      }),
      remove: vi.fn((key, callback) => {
        delete mockSyncData[key]
        callback?.()
      }),
      clear: vi.fn((callback) => {
        Object.keys(mockSyncData).forEach((k) => delete mockSyncData[k])
        callback?.()
      }),
      getBytesInUse: vi.fn(() => Promise.resolve(100)),
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    local: {
      get: vi.fn((keys, callback) => {
        callback({})
      }),
      set: vi.fn((obj, callback) => {
        callback?.()
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    lastError: null as chrome.runtime.LastError | null,
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn((_queryInfo, callback) => {
      callback([])
    }),
    update: vi.fn(),
    remove: vi.fn(),
  },
  i18n: {
    getUILanguage: vi.fn(() => 'zh-CN'),
  },
  permissions: {
    request: vi.fn((_perms, callback) => {
      callback(true)
    }),
    contains: vi.fn((_perms, callback) => {
      callback(true)
    }),
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
  },
  menus: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
}

globalThis.chrome = chromeMock as unknown as typeof chrome

// ── Window Globals Mock ──

globalThis.window.appVersion = '2.2.5'

globalThis.window.$t = vi.fn((key: string) => key)

globalThis.window.$message = {
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
} as any

globalThis.window.$notification = {
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
} as any

globalThis.window.$dialog = {} as any
globalThis.window.$loadingBar = {} as any

// ── Browser API Polyfills ──

// jsdom 的 Blob 没有可用的 .stream()，整体替换为 Node 原生 Blob
// 注意：这会影响 jsdom 中所有 Blob 相关操作，但测试环境不受影响
import { Blob as NodeBlob } from 'node:buffer'
globalThis.Blob = NodeBlob as any

// CompressionStream / DecompressionStream 在 jsdom 中不可用，从 Node 导入
if (typeof globalThis.CompressionStream === 'undefined') {
  globalThis.CompressionStream = CompressionStream as any
}
if (typeof globalThis.DecompressionStream === 'undefined') {
  globalThis.DecompressionStream = DecompressionStream as any
}

// ── Per-test Cleanup ──

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  // 清空 chrome.storage.sync mock 数据
  Object.keys(mockSyncData).forEach((k) => delete mockSyncData[k])
  chromeMock.runtime.lastError = null
})
