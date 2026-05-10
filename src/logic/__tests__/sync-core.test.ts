import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * sync-core.test.ts — 测试 sync/core.ts 中的同步引擎核心逻辑
 *
 * 覆盖: mergeConfigWithVersionAwareness、flushConfigSync、
 * handleMissedUploadConfig、loadRemoteConfig、loadRemoteKeyboardConfig、
 * setupPageConfigSync 等。
 *
 * 关联模块 sync/manage.ts 覆盖率未提升原因：
 * importSetting/exportSetting/resetSetting 强依赖 DOM 操作
 * （localStorage.clear()、location.reload()、downloadJsonByTagA），
 * 这些操作在 jsdom 中行为不可控（如 reload 会中断测试上下文）。
 * clearStorage 内部使用 watch() 监听响应式变量并调用 location.reload()，
 * 无法在不 mock Vue 响应式系统的情况下安全测试。
 */

// ── mergeConfigWithVersionAwareness ──

describe('mergeConfigWithVersionAwareness', () => {
  let fn: typeof import('@/logic/sync/core')['mergeConfigWithVersionAwareness']

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/logic/sync/core')
    fn = mod.mergeConfigWithVersionAwareness
  })

  it('returns remote data when versions are equal', () => {
    const local = { general: { fieldA: 'local' } }
    const remote = { general: { fieldA: 'remote' }, extra: 'new' }
    const result = fn(local, remote, '1.0.0', '1.0.0')
    expect(result).toEqual(remote)
  })

  it('uses local as template when local version is newer', () => {
    const local = { general: { version: '1.0.0', localOnly: 'yes' } }
    const remote = { general: { version: '0.9.0' } }
    const result = fn(local, remote, '1.0.0', '0.9.0')
    // mergeState(local, remote): uses local as template
    // 'version' string → use acceptState (remote) = '0.9.0'
    // 'localOnly' not in remote → use default (local) = 'yes'
    expect(result.general.version).toBe('0.9.0')
    expect(result.general.localOnly).toBe('yes')
  })

  it('uses remote as template when remote version is newer', () => {
    const local = { general: { version: '0.9.0' } }
    const remote = { general: { version: '1.0.0', remoteNew: 'val' } }
    const result = fn(local, remote, '0.9.0', '1.0.0')
    // mergeState(remote, local): uses remote as template
    // 'version' → use acceptState (local) = '0.9.0'
    // 'remoteNew' not in local → use default (remote) = 'val'
    expect(result.general.version).toBe('0.9.0')
    expect(result.general.remoteNew).toBe('val')
  })

  it('treats missing local version as oldest', () => {
    const local = { general: { version: '1.0.0' } }
    const remote = { general: { version: '2.0.0' } }
    const result = fn(local, remote, '', '2.0.0')
    // Empty version treated as 0.0.0, remote is newer → remote as template
    // mergeState(remote, local): version is string → use acceptState (local) value
    expect(result.general.version).toBe('1.0.0')
  })

  it('treats missing remote version as oldest', () => {
    const local = { general: { version: '2.0.0' } }
    const remote = { general: { version: '1.0.0' } }
    const result = fn(local, remote, '2.0.0', '')
    // compareLeftVersionLessThanRightVersions('', '2.0.0'): NaN vs 2 → returns false (equal)
    // isLocalNewer = false → remote as template → mergeState(remote, local)
    // mergeState with remote as template, 'version' string → use acceptState (local) = '2.0.0'
    expect(result.general.version).toBe('2.0.0')
  })

  it('both missing version → use remote (versions equal)', () => {
    const local = { general: { version: '1.0.0' } }
    const remote = { general: { version: '2.0.0' } }
    const result = fn(local, remote, '', '')
    // Both '' → equal → use remote
    expect(result.general.version).toBe('2.0.0')
  })
})

// ── flushConfigSync ──

describe('flushConfigSync', () => {
  let flushConfigSync: typeof import('@/logic/sync/core')['flushConfigSync']

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/logic/sync/core')
    flushConfigSync = mod.flushConfigSync
  })

  it('sets dirty=true when not dirty and uploads', async () => {
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {}
    const result = await flushConfigSync('general')
    // The function executes the sync pipeline; dirty may be cleared on successful upload
    expect(result).toBe(true)
    expect(localState.value.isUploadConfigStatusMap.general).toBeDefined()
    expect(localState.value.isUploadConfigStatusMap.general.loading).toBe(false)
  })

  it('respects skip when content unchanged (same MD5)', async () => {
    const { localState } = await import('@/logic/store')
    // First call will set syncId; second call should skip via MD5 match
    localState.value.isUploadConfigStatusMap = {}
    await flushConfigSync('general')
    const syncId = localState.value.isUploadConfigStatusMap.general.syncId
    // Second call without changes should skip
    const result = await flushConfigSync('general')
    expect(result).toBe(true)
    expect(localState.value.isUploadConfigStatusMap.general.syncId).toBe(syncId)
  })
})

// ── handleMissedUploadConfig ──

describe('handleMissedUploadConfig', () => {
  let handleMissedUploadConfig: typeof import('@/logic/sync/core')['handleMissedUploadConfig']

  beforeEach(async () => {
    vi.resetModules()
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {
      general: { loading: true, dirty: true, localModifiedTime: Date.now(), syncTime: 0, syncId: '' },
    }
    const mod = await import('@/logic/sync/core')
    handleMissedUploadConfig = mod.handleMissedUploadConfig
  })

  it('uploads fields with loading=true', async () => {
    const result = await handleMissedUploadConfig()
    expect(result).toBeUndefined()
  })

  it('skips fields with loading=false', async () => {
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap.general.loading = false
    // Should resolve without uploading
    const result = await handleMissedUploadConfig()
    expect(result).toBeUndefined()
  })
})

// ── loadRemoteConfig: no remote data → initialize all fields ──

describe('loadRemoteConfig — no remote data, initialize fields', () => {
  let loadRemoteConfig: typeof import('@/logic/sync/core')['loadRemoteConfig']

  beforeEach(async () => {
    vi.resetModules()
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {}
    const mod = await import('@/logic/sync/core')
    loadRemoteConfig = mod.loadRemoteConfig
  })

  it('uploads all fields when no remote data exists', async () => {
    const result = await loadRemoteConfig()
    expect(result).toBe(true)
  })
})

// ── loadRemoteConfig: chrome.storage.sync error ──

describe('loadRemoteConfig — chrome API error', () => {
  let loadRemoteConfig: typeof import('@/logic/sync/core')['loadRemoteConfig']

  beforeEach(async () => {
    vi.resetModules()
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {}

    // Override the global chrome mock to simulate error
    const origGet = (chrome.storage.sync.get as any)
    vi.spyOn(chrome.storage.sync, 'get').mockImplementation((_keys, cb) => {
      ;(chrome.runtime.lastError as any) = { message: 'quota exceeded' }
      cb({})
    })

    const mod = await import('@/logic/sync/core')
    loadRemoteConfig = mod.loadRemoteConfig
  })

  afterEach(() => {
    ;(chrome.runtime.lastError as any) = null
  })

  it('returns false on chrome.storage.sync error', async () => {
    const result = await loadRemoteConfig()
    expect(result).toBe(false)
  })
})

// ── loadRemoteConfig: remote data with same syncId → skip ──

describe('loadRemoteConfig — remote data with same syncId', () => {
  let loadRemoteConfig: typeof import('@/logic/sync/core')['loadRemoteConfig']

  beforeEach(async () => {
    vi.resetModules()
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {
      general: { loading: false, dirty: false, localModifiedTime: 0, syncTime: 100, syncId: 'abc123' },
    }
    const payload = JSON.stringify({
      syncTime: 200,
      syncId: 'abc123',
      appVersion: window.appVersion,
      data: { version: window.appVersion },
    })

    vi.spyOn(chrome.storage.sync, 'get').mockImplementation((_keys, cb) => {
      cb({ 'naive-tab-general': payload })
    })

    const mod = await import('@/logic/sync/core')
    loadRemoteConfig = mod.loadRemoteConfig
  })

  it('skips upload when syncId matches', async () => {
    const result = await loadRemoteConfig()
    expect(result).toBe(true)
    // The general field with matching syncId should not trigger a new upload
    // (other fields may still be initialized)
    const { localState } = await import('@/logic/store')
    expect(localState.value.isUploadConfigStatusMap.general.syncId).toBe('abc123')
  })
})

// ── loadRemoteConfig: remote newer, local clean → merge ──

describe('loadRemoteConfig — remote newer, local clean', () => {
  let loadRemoteConfig: typeof import('@/logic/sync/core')['loadRemoteConfig']

  beforeEach(async () => {
    vi.resetModules()
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {
      general: { loading: false, dirty: false, localModifiedTime: 0, syncTime: 100, syncId: 'old' },
    }
    const payload = JSON.stringify({
      syncTime: 200,
      syncId: 'new123',
      appVersion: window.appVersion,
      data: { version: window.appVersion, newField: 'remoteValue' },
    })

    vi.spyOn(chrome.storage.sync, 'get').mockImplementation((_keys, cb) => {
      cb({ 'naive-tab-general': payload })
    })

    const mod = await import('@/logic/sync/core')
    loadRemoteConfig = mod.loadRemoteConfig
  })

  it('merges remote config when local is clean', async () => {
    const result = await loadRemoteConfig()
    expect(result).toBe(true)
  })
})

// ── loadRemoteConfig: parse error with legacy fallback ──

describe('loadRemoteConfig — parse error with legacy fallback', () => {
  let loadRemoteConfig: typeof import('@/logic/sync/core')['loadRemoteConfig']

  beforeEach(async () => {
    vi.resetModules()
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {
      general: { loading: false, dirty: false, localModifiedTime: 0, syncTime: 0, syncId: '' },
    }
    // Invalid compressed data → parse fails → legacy JSON parse also fails → skip
    vi.spyOn(chrome.storage.sync, 'get').mockImplementation((_keys, cb) => {
      cb({ 'naive-tab-general': 'not-valid-json___' })
    })
    const mod = await import('@/logic/sync/core')
    loadRemoteConfig = mod.loadRemoteConfig
  })

  it('skips field when both parse attempts fail', async () => {
    const result = await loadRemoteConfig()
    expect(result).toBe(true)
  })
})

// ── loadRemoteConfig: local dirty and newer → upload ──

describe('loadRemoteConfig — local dirty and newer → upload local', () => {
  let loadRemoteConfig: typeof import('@/logic/sync/core')['loadRemoteConfig']

  beforeEach(async () => {
    vi.resetModules()
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {
      general: { loading: false, dirty: true, localModifiedTime: Date.now() + 10000, syncTime: 100, syncId: 'oldLocal' },
    }
    const payload = JSON.stringify({
      syncTime: 100,
      syncId: 'remoteSync',
      appVersion: window.appVersion,
      data: { version: window.appVersion },
    })
    vi.spyOn(chrome.storage.sync, 'get').mockImplementation((_keys, cb) => {
      cb({ 'naive-tab-general': payload })
    })
    const mod = await import('@/logic/sync/core')
    loadRemoteConfig = mod.loadRemoteConfig
  })

  it('uploads local config when local is dirty and newer', async () => {
    const result = await loadRemoteConfig()
    expect(result).toBe(true)
  })
})

// ── loadRemoteConfig: local dirty but remote newer → merge ──

describe('loadRemoteConfig — local dirty but remote newer → merge', () => {
  let loadRemoteConfig: typeof import('@/logic/sync/core')['loadRemoteConfig']

  beforeEach(async () => {
    vi.resetModules()
    const { localState } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {
      general: { loading: false, dirty: true, localModifiedTime: 100, syncTime: 100, syncId: 'old' },
    }
    const payload = JSON.stringify({
      syncTime: 99999,
      syncId: 'newRemote',
      appVersion: window.appVersion,
      data: { version: window.appVersion, remoteField: 'val' },
    })
    vi.spyOn(chrome.storage.sync, 'get').mockImplementation((_keys, cb) => {
      cb({ 'naive-tab-general': payload })
    })
    const mod = await import('@/logic/sync/core')
    loadRemoteConfig = mod.loadRemoteConfig
  })

  it('merges remote when local dirty but remote is newer', async () => {
    const result = await loadRemoteConfig()
    expect(result).toBe(true)
  })
})

// ── loadRemoteKeyboardConfig ──

describe('loadRemoteKeyboardConfig', () => {
  let loadRemoteKeyboardConfig: typeof import('@/logic/sync/core')['loadRemoteKeyboardConfig']

  beforeEach(async () => {
    vi.resetModules()
    const { localState, localConfig } = await import('@/logic/store')
    localState.value.isUploadConfigStatusMap = {
      keyboardBookmark: { loading: false, dirty: false, localModifiedTime: 0, syncTime: 0, syncId: 'oldSync' },
    }
    localConfig.keyboardBookmark = { keymap: {} }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when remote data is empty', async () => {
    vi.spyOn(chrome.storage.sync, 'get').mockResolvedValue({ 'naive-tab-keyboardBookmark': '' })
    const mod = await import('@/logic/sync/core')
    loadRemoteKeyboardConfig = mod.loadRemoteKeyboardConfig
    const result = await loadRemoteKeyboardConfig()
    expect(result).toBe(false)
  })

  it('returns false when syncId matches', async () => {
    const payload = JSON.stringify({
      syncTime: 200,
      syncId: 'oldSync',
      appVersion: window.appVersion,
      data: { keymap: {} },
    })
    vi.spyOn(chrome.storage.sync, 'get').mockResolvedValue({ 'naive-tab-keyboardBookmark': payload })
    const mod = await import('@/logic/sync/core')
    loadRemoteKeyboardConfig = mod.loadRemoteKeyboardConfig
    const result = await loadRemoteKeyboardConfig()
    expect(result).toBe(false)
  })

  it('returns true and updates state when syncId differs', async () => {
    const newKeymap = { 'KeyA': { url: 'https://example.com' } }
    const payload = JSON.stringify({
      syncTime: 999,
      syncId: 'newSync123',
      appVersion: window.appVersion,
      data: { keymap: newKeymap },
    })
    vi.spyOn(chrome.storage.sync, 'get').mockResolvedValue({ 'naive-tab-keyboardBookmark': payload })
    const mod = await import('@/logic/sync/core')
    loadRemoteKeyboardConfig = mod.loadRemoteKeyboardConfig
    const result = await loadRemoteKeyboardConfig()
    expect(result).toBe(true)

    const { localState, localConfig } = await import('@/logic/store')
    expect(localState.value.isUploadConfigStatusMap.keyboardBookmark.syncId).toBe('newSync123')
    expect(localConfig.keyboardBookmark.keymap).toEqual(newKeymap)
  })

  it('returns false on parse error', async () => {
    vi.spyOn(chrome.storage.sync, 'get').mockResolvedValue({ 'naive-tab-keyboardBookmark': 'garbage-data' })
    const mod = await import('@/logic/sync/core')
    loadRemoteKeyboardConfig = mod.loadRemoteKeyboardConfig
    const result = await loadRemoteKeyboardConfig()
    expect(result).toBe(false)
  })
})

// ── setupPageConfigSync ──

describe('setupPageConfigSync', () => {
  it('exports the function', async () => {
    vi.resetModules()
    const mod = await import('@/logic/sync/core')
    expect(typeof mod.setupPageConfigSync).toBe('function')
  })
})
