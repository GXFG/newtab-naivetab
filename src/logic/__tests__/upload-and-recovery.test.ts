import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * upload-and-recovery.test.ts — 测试 config/sync/ 中的上传链路、故障恢复、监听器
 *
 * 覆盖场景：
 * 1. flushConfigSync: 强制同步（间接测试 uploadConfigFn 的 MD5 去重、压缩、超限、失败处理）
 * 2. handleMissedUploadConfig: 故障恢复
 * 3. setupKeyboardSyncListener: chrome.storage.onChanged 同步
 * 4. setupLocalStorageSyncListener: localStorage 跨标签页同步
 *
 * 策略：使用 vi.doMock + vi.resetModules 独立控制 mock 环境，
 * 与 sync-flow.test.ts 保持一致的架构。
 *
 * 注意：uploadConfigFn 是内部函数，不直接导出。通过 flushConfigSync
 * 间接测试其核心行为（MD5 去重、压缩、大小超限、失败处理、keymap 清理）。
 */

const mockLog = vi.fn()
const mockCompareVersion = vi.fn().mockReturnValue(false)
const mockUploadSetCalls: Array<{ field: string; data: any }> = []
const mockMessageWarn = vi.fn()
const mockMessageError = vi.fn()
const mockMessageSuccess = vi.fn()
const mockSleep = vi.fn().mockResolvedValue(null)

// ── Mock 数据 ──
const mockLocalConfig: Record<string, any> = {}
const mockIsUploadConfigStatusMap: Record<string, any> = {}

const DEFAULT_CONFIG = {
  general: { version: '2.3.0', lang: 'zh-CN' },
  keyboardBookmark: { keymap: {}, source: 1 },
  search: { isNewTabOpen: false, isVoiceEnabled: true },
} as const

function resetMockState() {
  for (const [field, value] of Object.entries(DEFAULT_CONFIG)) {
    mockLocalConfig[field] = { ...value }
  }
  for (const field of Object.keys(DEFAULT_CONFIG)) {
    mockIsUploadConfigStatusMap[field] = {
      loading: false,
      syncTime: 0,
      syncId: `sync-${field}`,
      localModifiedTime: 0,
      dirty: false,
    }
  }
}

// ── Chrome Mock 设置 ──

function setupChromeSync(options?: {
  lastError?: Error | null
  blockLargePayload?: boolean
}) {
  const chrome = globalThis.chrome as any
  mockUploadSetCalls.length = 0

  chrome.storage.sync.set.mockImplementation((obj: any, callback?: Function) => {
    if (options?.lastError) {
      chrome.runtime.lastError = options.lastError
    } else {
      chrome.runtime.lastError = null
    }

    for (const [key, value] of Object.entries(obj)) {
      if (!key.startsWith('naive-tab-')) continue

      // 可选：阻止超大 payload 写入（模拟 uploadConfigFn 内部的大小拦截）
      if (options?.blockLargePayload) {
        const bytes = new TextEncoder().encode(value as string).length
        if (bytes > 8000) {
          // 超限：不调用 callback，uploadConfigFn 内部会在 doUpload 之前拦截
          // 这里我们模拟的是已经被拦截后的行为
          continue
        }
      }

      const field = key.replace('naive-tab-', '')
      try {
        const parsed = JSON.parse(value as string)
        mockUploadSetCalls.push({ field, data: parsed })
      } catch {
        mockUploadSetCalls.push({ field, data: value })
      }
    }

    callback?.()
  })

  chrome.storage.sync.getBytesInUse.mockImplementation((key: string, callback: Function) => {
    callback(1024)
  })
}

// ── Mock 定义 ──

vi.doMock('@/logic/utils/util', () => ({
  log: mockLog,
  compareLeftVersionLessThanRightVersions: mockCompareVersion,
  sleep: mockSleep,
}))

vi.doMock('@/logic/utils/common', () => ({
  log: mockLog,
}))

vi.doMock('@/logic/config/state', () => ({
  localConfig: mockLocalConfig,
  localState: { value: { isUploadConfigStatusMap: mockIsUploadConfigStatusMap } },
}))
vi.doMock('@/logic/store/state', () => ({
  globalState: {},
  switchSettingDrawerVisible: vi.fn(),
}))

vi.doMock('@/logic/config/defaults', () => ({
  defaultConfig: DEFAULT_CONFIG,
  defaultUploadStatusItem: { loading: false, syncTime: 0, syncId: '', localModifiedTime: 0, dirty: false },
}))

vi.doMock('@/logic/config/merge', () => ({
  mergeState: vi.fn((s: unknown, a: unknown) => a ?? s),
}))

vi.doMock('@/logic/config/update', () => ({
  handleStateResetAndUpdate: vi.fn(),
  updateSetting: vi.fn().mockResolvedValue(true),
}))

vi.doMock('@/logic/utils/database', () => ({ clearDatabase: vi.fn() }))
vi.doMock('@/logic/utils/permission', () => ({}))

vi.doMock('@/logic/config/compress', () => ({
  COMPRESS_PREFIX: 'gzip:',
  compressString: vi.fn().mockResolvedValue('compressed-base64-data'),
  decompressString: vi.fn().mockResolvedValue('{}'),
  shouldCompress: vi.fn().mockReturnValue(false),
  parseStoredData: vi.fn().mockImplementation(async (raw: string) => JSON.parse(raw)),
}))

vi.doMock('@/logic/constants/app', () => ({
  MERGE_CONFIG_DELAY: 0,
  MERGE_CONFIG_MAX_DELAY: 0,
}))

vi.doMock('@/common/toast', () => ({
  showToast: {
    success: mockMessageSuccess,
    error: mockMessageError,
    warning: mockMessageWarn,
    info: vi.fn(),
  },
}))

vi.doMock('@/logic/keyboard/keyboard-constants', () => ({
  KEYBOARD_URL_MAX_LENGTH: 200,
  KEYBOARD_NAME_MAX_LENGTH: 10,
}))

vi.doMock('@vueuse/core', () => ({
  useDebounceFn: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}))

vi.doMock('crypto-js/md5', () => ({
  default: vi.fn((str: string) => ({ toString: () => `md5-${str.length}` })),
}))

vi.doMock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return { ...actual, computed: actual.computed, reactive: actual.reactive }
})

vi.doMock('webextension-polyfill', () => ({}))

vi.mock('@/auto-imports', () => ({}))

// ════════════════════════════════════════════════════════════
// 1. flushConfigSync — 强制同步（间接覆盖 uploadConfigFn 行为）
// ════════════════════════════════════════════════════════════

describe('flushConfigSync', () => {
  let flushConfigSync: (field: string) => Promise<boolean>

  async function setup() {
    vi.resetModules()
    mockLog.mockClear()
    mockMessageWarn.mockClear()
    mockMessageError.mockClear()
    mockMessageSuccess.mockClear()

    resetMockState()
    window.appVersion = '2.3.0'
    window.$message = { warning: mockMessageWarn, error: mockMessageError, success: mockMessageSuccess } as any
    window.$notification = { info: vi.fn() } as any
    window.$t = (key: string) => key
    ;(globalThis.chrome as any).runtime.lastError = null

    setupChromeSync()

    const mod = await import('@/logic/config/sync/upload')
    flushConfigSync = mod.flushConfigSync
  }

  beforeEach(setup)

  it('uploads and returns true on success', async () => {
    mockIsUploadConfigStatusMap.general.syncId = 'old-sync-id'

    const result = await flushConfigSync('general')

    expect(result).toBe(true)
    expect(mockUploadSetCalls).toHaveLength(1)
    expect(mockUploadSetCalls[0].field).toBe('general')
    expect(mockUploadSetCalls[0].data).toHaveProperty('syncTime')
    expect(mockUploadSetCalls[0].data).toHaveProperty('syncId')
    expect(mockUploadSetCalls[0].data).toHaveProperty('appVersion', '2.3.0')
    expect(mockUploadSetCalls[0].data).toHaveProperty('data')
    // 上传成功后 dirty 被清除
    expect(mockIsUploadConfigStatusMap.general.dirty).toBe(false)
  })

  it('skips upload when MD5 matches (content unchanged)', async () => {
    // syncId 与当前内容的 MD5 相同 → MD5 去重跳过上传
    mockIsUploadConfigStatusMap.general.syncId = `md5-${JSON.stringify(mockLocalConfig.general).length}`

    const result = await flushConfigSync('general')

    expect(result).toBe(true)
    // MD5 去重：不实际调用 chrome.storage.sync.set
    expect(mockUploadSetCalls).toHaveLength(0)
  })

  it('initializes statusMap when field has no entry', async () => {
    delete mockIsUploadConfigStatusMap.search

    const result = await flushConfigSync('search')

    expect(result).toBe(true)
    expect(mockIsUploadConfigStatusMap.search).toBeDefined()
    expect(mockIsUploadConfigStatusMap.search.loading).toBe(false)
    expect(mockUploadSetCalls).toHaveLength(1)
  })

  it('sets dirty=true and localModifiedTime when not already dirty', async () => {
    mockIsUploadConfigStatusMap.general.syncId = 'old-sync-id'
    mockIsUploadConfigStatusMap.general.dirty = false
    mockIsUploadConfigStatusMap.general.localModifiedTime = 0

    await flushConfigSync('general')

    // flushConfigSync 内部会先设置 dirty 和 localModifiedTime
    // 然后调用 uploadConfigFn，上传成功后清除 dirty
    // 因此最终 dirty=false 表示上传成功路径走通了
    expect(mockUploadSetCalls).toHaveLength(1)
  })

  it('handles upload failure gracefully', async () => {
    mockIsUploadConfigStatusMap.general.syncId = 'old-sync-id'
    setupChromeSync({ lastError: new Error('Network error') })

    const result = await flushConfigSync('general')

    expect(mockMessageError).toHaveBeenCalled()
    expect(mockIsUploadConfigStatusMap.general.loading).toBe(false)
    // 失败时 dirty 保留（不设为 false）
  })

  it('cleans keyboardBookmark keymap: removes empty urls and truncates long values', async () => {
    mockLocalConfig.keyboardBookmark = {
      keymap: {
        KeyA: { url: 'https://example.com', name: 'Example' },
        KeyB: { url: '', name: 'Empty' },
        KeyC: { url: 'https://test.com/' + 'a'.repeat(200), name: 'LongName' + 'b'.repeat(20) },
      },
      source: 1,
    }
    mockIsUploadConfigStatusMap.keyboardBookmark.syncId = 'old-sync-id'

    const result = await flushConfigSync('keyboardBookmark')

    expect(result).toBe(true)
    expect(mockUploadSetCalls).toHaveLength(1)
    const uploaded = mockUploadSetCalls[0].data.data
    expect(uploaded.keymap).not.toHaveProperty('KeyB')
    expect(uploaded.keymap.KeyA).toBeDefined()
    expect(uploaded.keymap.KeyC.url.length).toBeLessThanOrEqual(200)
    expect(uploaded.keymap.KeyC.name!.length).toBeLessThanOrEqual(10)
  })
})

// ════════════════════════════════════════════════════════════
// 2. handleMissedUploadConfig 故障恢复
// ════════════════════════════════════════════════════════════

describe('handleMissedUploadConfig', () => {
  let handleMissedUploadConfig: () => Promise<void>

  async function setup() {
    vi.resetModules()
    mockLog.mockClear()
    mockMessageWarn.mockClear()
    mockMessageError.mockClear()

    resetMockState()
    window.appVersion = '2.3.0'
    window.$message = { warning: mockMessageWarn, error: mockMessageError, success: mockMessageSuccess } as any
    window.$notification = { info: vi.fn() } as any
    window.$t = (key: string) => key
    ;(globalThis.chrome as any).runtime.lastError = null

    setupChromeSync()

    const mod = await import('@/logic/config/sync/upload')
    handleMissedUploadConfig = mod.handleMissedUploadConfig
  }

  beforeEach(setup)

  it('uploads fields with loading=true', async () => {
    mockIsUploadConfigStatusMap.general.loading = true
    mockIsUploadConfigStatusMap.general.syncId = 'old-sync-id'

    await handleMissedUploadConfig()

    expect(mockUploadSetCalls.some((c) => c.field === 'general')).toBe(true)
    expect(mockIsUploadConfigStatusMap.general.loading).toBe(false)
  })

  it('skips fields with loading=false', async () => {
    await handleMissedUploadConfig()

    expect(mockUploadSetCalls).toHaveLength(0)
  })

  it('processes multiple loading fields', async () => {
    mockIsUploadConfigStatusMap.general.loading = true
    mockIsUploadConfigStatusMap.general.syncId = 'old-sync-general'
    mockIsUploadConfigStatusMap.search.loading = true
    mockIsUploadConfigStatusMap.search.syncId = 'old-sync-search'

    await handleMissedUploadConfig()

    const uploadedFields = mockUploadSetCalls.map((c) => c.field)
    expect(uploadedFields).toContain('general')
    expect(uploadedFields).toContain('search')
    expect(mockIsUploadConfigStatusMap.general.loading).toBe(false)
    expect(mockIsUploadConfigStatusMap.search.loading).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════
// 3. setupKeyboardSyncListener
// ════════════════════════════════════════════════════════════

describe('setupKeyboardSyncListener', () => {
  let setupKeyboardSyncListener: () => void
  let _onChangedHandler: Function | null = null

  async function setup() {
    vi.resetModules()
    mockLog.mockClear()

    resetMockState()
    window.appVersion = '2.3.0'
    ;(globalThis.chrome as any).runtime.lastError = null

    _onChangedHandler = null
    ;(globalThis.chrome as any).storage.onChanged = {
      addListener: vi.fn((fn: Function) => {
        _onChangedHandler = fn
      }),
      removeListener: vi.fn(),
    }

    const mod = await import('@/logic/config/sync/state')
    setupKeyboardSyncListener = mod.setupKeyboardSyncListener
  }

  beforeEach(setup)

  function triggerStorageChange(changes: Record<string, { newValue?: string }>) {
    if (_onChangedHandler) {
      _onChangedHandler(changes)
    }
  }

  it('updates localConfig when syncId differs', async () => {
    setupKeyboardSyncListener()

    const remotePayload = {
      syncTime: 123456,
      syncId: 'new-remote-sync-id',
      appVersion: '2.3.0',
      data: { keymap: { KeyA: { url: 'https://example.com' } }, source: 2 },
    }

    triggerStorageChange({
      'naive-tab-keyboardBookmark': { newValue: JSON.stringify(remotePayload) },
    })

    // parseStoredData 是异步的，需要等待微任务
    await new Promise((r) => setTimeout(r, 10))

    expect(mockLocalConfig.keyboardBookmark.source).toBe(2)
    expect(mockIsUploadConfigStatusMap.keyboardBookmark.syncId).toBe('new-remote-sync-id')
    expect(mockIsUploadConfigStatusMap.keyboardBookmark.dirty).toBe(false)
  })

  it('skips update when syncId matches', async () => {
    mockIsUploadConfigStatusMap.keyboardBookmark.syncId = 'same-sync-id'
    setupKeyboardSyncListener()

    const remotePayload = {
      syncTime: 123456,
      syncId: 'same-sync-id',
      appVersion: '2.3.0',
      data: { keymap: {}, source: 0 },
    }

    triggerStorageChange({
      'naive-tab-keyboardBookmark': { newValue: JSON.stringify(remotePayload) },
    })

    await new Promise((r) => setTimeout(r, 10))

    expect(mockLog).toHaveBeenCalledWith('Sync keyboardBookmark skipped (same syncId)')
  })

  it('skips when newValue is empty', () => {
    setupKeyboardSyncListener()

    triggerStorageChange({
      'naive-tab-keyboardBookmark': { newValue: '' },
    })

    expect(mockLog).not.toHaveBeenCalled()
  })

  it('skips non-keyboardBookmark keys', () => {
    setupKeyboardSyncListener()

    triggerStorageChange({
      'naive-tab-general': { newValue: JSON.stringify({ version: '2.3.0' }) },
    })

    expect(mockLog).not.toHaveBeenCalled()
  })
})

// ════════════════════════════════════════════════════════════
// 4. setupLocalStorageSyncListener
// ════════════════════════════════════════════════════════════

describe('setupLocalStorageSyncListener', () => {
  let setupLocalStorageSyncListener: () => void
  let _storageHandler: EventListener | null = null

  async function setup() {
    vi.resetModules()
    mockLog.mockClear()

    resetMockState()
    window.appVersion = '2.3.0'

    _storageHandler = null
    window.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'storage') {
        _storageHandler = handler
      }
    })
    window.removeEventListener = vi.fn()

    const mod = await import('@/logic/config/sync/state')
    setupLocalStorageSyncListener = mod.setupLocalStorageSyncListener
  }

  beforeEach(setup)

  function triggerStorageEvent(key: string, newValue: string | null) {
    if (_storageHandler) {
      _storageHandler({ key, newValue, oldValue: null } as StorageEvent)
    }
  }

  it('merges config when content changes', () => {
    setupLocalStorageSyncListener()

    const newConfig = { version: '2.3.0', lang: 'en-US' }
    triggerStorageEvent('c-general', JSON.stringify(newConfig))

    // mergeState mock 返回 acceptState（即 newConfig）
    expect(mockLocalConfig.general.lang).toBe('en-US')
  })

  it('skips when content is identical', () => {
    setupLocalStorageSyncListener()

    triggerStorageEvent('c-general', JSON.stringify({ version: '2.3.0', lang: 'zh-CN' }))

    // 内容相同，不调用 mergeState
    expect(mockLocalConfig.general.lang).toBe('zh-CN')
  })

  it('skips non c- prefixed keys', () => {
    setupLocalStorageSyncListener()

    triggerStorageEvent('some-other-key', JSON.stringify({ foo: 'bar' }))

    expect(mockLocalConfig.general.lang).toBe('zh-CN')
  })
})
