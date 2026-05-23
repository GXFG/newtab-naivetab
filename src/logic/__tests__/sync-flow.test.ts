import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * sync-flow.test.ts — 测试 sync/core.ts 中的 loadRemoteConfig 同步分支
 *
 * 覆盖 loadRemoteConfig 的 5 种同步场景。
 * 使用 vi.doMock + vi.resetModules 独立控制 mock 环境，
 * 避免与 storage.test.ts 的 vi.mock 冲突。
 *
 * 策略：所有字段都提供云端数据，测试中只修改目标字段的同步状态
 * 来触发不同分支，其他字段保持 syncId 一致（被跳过）。
 */

const mockLog = vi.fn()
const mockUploadSetCalls: Array<{ field: string; data: any }> = []

// ── Mock 数据（固定引用，测试中重置内部属性） ──
const mockLocalConfig: Record<string, any> = {}
const mockIsUploadConfigStatusMap: Record<string, any> = {}

const CONFIG_FIELDS = {
  general: { version: '2.3.0', lang: 'zh-CN' },
  keyboardBookmark: { keymap: {}, source: 1 },
  search: { isNewTabOpen: false, isVoiceEnabled: true },
} as const

const DEFAULT_SYNC_IDS: Record<string, string> = {}

// ── 工具函数 ──

function buildPayload(field: string, data: Record<string, any>, appVersion: string, syncId: string) {
  return JSON.stringify({ syncTime: Date.now(), syncId, appVersion, data })
}

function resetMockState() {
  // 重置 localConfig
  for (const [field, value] of Object.entries(CONFIG_FIELDS)) {
    mockLocalConfig[field] = { ...value }
  }
  // 重置同步状态
  for (const field of Object.keys(CONFIG_FIELDS)) {
    DEFAULT_SYNC_IDS[field] = `default-sync-${field}`
    mockIsUploadConfigStatusMap[field] = {
      loading: false,
      syncTime: 0,
      syncId: DEFAULT_SYNC_IDS[field],
      localModifiedTime: 0,
      dirty: false,
      retryCount: 0,
      lastError: '',
      syncStatus: 'idle',
    }
  }
}

function populateCloudData(modifications: Record<string, { data: Record<string, any>; appVersion?: string; syncId?: string }>) {
  const cloudData: Record<string, string> = {}
  for (const [field, value] of Object.entries(CONFIG_FIELDS)) {
    const mod = modifications[field]
    const data = mod?.data ?? value
    const appVersion = mod?.appVersion ?? '2.3.0'
    const syncId = mod?.syncId ?? DEFAULT_SYNC_IDS[field]
    cloudData[`naive-tab-${field}`] = buildPayload(field, data, appVersion, syncId)
  }
  return cloudData
}

function setupChromeSync(cloudData: Record<string, string>) {
  const chromeSync = (globalThis.chrome as any).storage.sync
  mockUploadSetCalls.length = 0

  chromeSync.get.mockImplementation((keys: any, callback: Function) => {
    if (keys === null) {
      callback({ ...cloudData })
    } else if (typeof keys === 'string') {
      callback({ [keys]: cloudData[keys] ?? undefined })
    } else {
      const result: Record<string, unknown> = {}
      for (const key of keys) {
        result[key] = cloudData[key]
      }
      callback(result)
    }
  })

  chromeSync.set.mockImplementation((obj: any, callback?: Function) => {
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('naive-tab-')) {
        const field = key.replace('naive-tab-', '')
        try {
          const parsed = JSON.parse(value as string)
          mockUploadSetCalls.push({ field, data: parsed })
        } catch {
          mockUploadSetCalls.push({ field, data: value })
        }
      }
    }
    callback?.()
  })
}

// ── Mock 定义 ──

vi.doMock('@/logic/utils/util', () => ({
  log: mockLog,
  compareLeftVersionLessThanRightVersions: (left: string, right: string) => {
    const l = left.split('.').map(Number)
    const r = right.split('.').map(Number)
    for (let i = 0; i < Math.max(l.length, r.length); i++) {
      if ((l[i] || 0) < (r[i] || 0)) return true
      if ((l[i] || 0) > (r[i] || 0)) return false
    }
    return false
  },
  sleep: vi.fn(),
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
  defaultConfig: CONFIG_FIELDS,
  defaultUploadStatusItem: { loading: false, syncTime: 0, syncId: '', localModifiedTime: 0, dirty: false, retryCount: 0, lastError: '', syncStatus: 'idle' },
}))

// Recursive merge helper (cannot reference vi.doMock factory's own name)
const mockMergeState = (state: unknown, acceptState: unknown): unknown => {
  if (acceptState === undefined || acceptState === null) return state
  if (Object.prototype.toString.call(state) !== Object.prototype.toString.call(acceptState)) return state
  if (typeof acceptState === 'string' || typeof acceptState === 'number' || typeof acceptState === 'boolean') {
    return acceptState
  }
  if (Object.prototype.toString.call(acceptState) !== '[object Object]') return acceptState
  const acceptObj = acceptState as Record<string, unknown>
  const stateObj = state as Record<string, unknown>
  const hasKeymapPattern = Object.keys(acceptObj).some(
    (key) => key.startsWith('Key') || key.startsWith('Digit') || key.startsWith('Numpad'),
  )
  if (hasKeymapPattern) return acceptState
  const filterState: Record<string, unknown> = {}
  for (const f of Object.keys(stateObj)) {
    if (Object.prototype.hasOwnProperty.call(acceptObj, f)) {
      filterState[f] = mockMergeState(stateObj[f], acceptObj[f])
    } else {
      filterState[f] = stateObj[f]
    }
  }
  return filterState
}

vi.doMock('@/logic/config/merge', () => ({
  mergeState: mockMergeState,
}))

const mockUpdateSetting = vi.fn().mockResolvedValue(true)

vi.doMock('@/logic/config/update', () => ({
  handleStateResetAndUpdate: vi.fn(),
  updateSetting: mockUpdateSetting,
}))

vi.doMock('@/logic/utils/database', () => ({ clearDatabase: vi.fn() }))
vi.doMock('@/logic/utils/permission', () => ({}))

vi.doMock('@/logic/config/compress', () => ({
  COMPRESS_PREFIX: 'gzip:',
  compressString: vi.fn().mockResolvedValue('compressed'),
  decompressString: vi.fn().mockResolvedValue('{}'),
  shouldCompress: vi.fn().mockReturnValue(false),
  parseStoredData: vi.fn().mockImplementation(async (raw: string) => JSON.parse(raw)),
}))

vi.doMock('@/logic/constants/app', () => ({
  MERGE_CONFIG_DELAY: 2000,
  MERGE_CONFIG_MAX_DELAY: 5000,
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

// ── Tests ──

describe('loadRemoteConfig sync branches', () => {
  let loadRemoteConfig: () => Promise<unknown>

  beforeEach(async () => {
    vi.resetModules()
    mockLog.mockClear()
    mockUpdateSetting.mockClear()

    resetMockState()

    const mod = await import('@/logic/config/sync/loader')
    loadRemoteConfig = mod.loadRemoteConfig

    window.appVersion = '2.3.0'
  })

  it('Branch 1: cloud missing → upload local config to initialize', async () => {
    const cloudData = populateCloudData({})
    setupChromeSync(cloudData)

    // 从云端移除 general 字段
    delete cloudData['naive-tab-general']

    await loadRemoteConfig()

    // 云端无 general，应触发上传初始化
    const uploadFields = mockUploadSetCalls.map((c) => c.field)
    expect(uploadFields).toContain('general')
    // 其他字段 syncId 一致，不应被上传
    expect(uploadFields.filter((f) => f !== 'general')).toEqual([])
  })

  it('Branch 2: syncId identical → skip, no update', async () => {
    const cloudData = populateCloudData({})
    setupChromeSync(cloudData)

    await loadRemoteConfig()

    // 所有字段 syncId 一致，应全部跳过
    expect(mockUpdateSetting).not.toHaveBeenCalled()
    expect(mockUploadSetCalls).toEqual([])
  })

  it('Branch 3: local clean (dirty=false, syncId differs) → version-aware merge', async () => {
    const remoteSyncId = 'remote-sync-general'
    const cloudData = populateCloudData({
      general: { data: { version: '2.3.0', lang: 'en' }, syncId: remoteSyncId },
    })
    setupChromeSync(cloudData)

    // 修改 general 的本地 syncId，使其不同
    mockIsUploadConfigStatusMap.general.syncId = 'local-old-sync'
    mockIsUploadConfigStatusMap.general.dirty = false

    await loadRemoteConfig()

    // 版本相同 → use remote
    expect(mockUpdateSetting).toHaveBeenCalledWith(
      expect.objectContaining({
        general: { version: '2.3.0', lang: 'en' },
      }),
    )
    // 同步状态应更新：syncId 设为过滤后数据的 MD5（防止 watch 触发多余上传）
    expect(mockIsUploadConfigStatusMap.general.syncId).toBeTruthy()
    expect(mockIsUploadConfigStatusMap.general.dirty).toBe(false)
    expect(mockIsUploadConfigStatusMap.general.loading).toBe(false)
    expect(mockIsUploadConfigStatusMap.general.retryCount).toBe(0)
    expect(mockIsUploadConfigStatusMap.general.lastError).toBe('')
    expect(mockIsUploadConfigStatusMap.general.syncStatus).toBe('idle')
  })

  it('Branch 4: local newer (dirty=true, localModifiedTime > syncTime) → upload local', async () => {
    const remoteSyncId = 'remote-sync-general'
    const cloudData = populateCloudData({
      general: { data: { version: '2.2.5', lang: 'zh-CN' }, appVersion: '2.2.5', syncId: remoteSyncId },
    })
    setupChromeSync(cloudData)

    mockIsUploadConfigStatusMap.general.syncId = 'local-different'
    mockIsUploadConfigStatusMap.general.dirty = true
    mockIsUploadConfigStatusMap.general.localModifiedTime = Date.now() + 10000 // 比云端更新

    await loadRemoteConfig()

    // 本地更新 → 应上传而非合并
    expect(mockUpdateSetting).not.toHaveBeenCalled()
    const uploadFields = mockUploadSetCalls.map((c) => c.field)
    expect(uploadFields).toContain('general')
  })

  it('Branch 5: remote newer (dirty=true, localModifiedTime <= syncTime) → merge + clear dirty', async () => {
    const remoteSyncId = 'remote-sync-general'
    const cloudData = populateCloudData({
      general: { data: { version: '2.3.0', lang: 'fr' }, syncId: remoteSyncId },
    })
    setupChromeSync(cloudData)

    mockIsUploadConfigStatusMap.general.syncId = 'local-different'
    mockIsUploadConfigStatusMap.general.dirty = true
    mockIsUploadConfigStatusMap.general.localModifiedTime = Date.now() - 100000 // 比云端更早

    await loadRemoteConfig()

    // 应触发版本感知合并
    expect(mockUpdateSetting).toHaveBeenCalledWith(
      expect.objectContaining({
        general: { version: '2.3.0', lang: 'fr' },
      }),
    )
    // dirty 应被清除，syncId 设为过滤后数据的 MD5
    expect(mockIsUploadConfigStatusMap.general.dirty).toBe(false)
    expect(mockIsUploadConfigStatusMap.general.loading).toBe(false)
    expect(mockIsUploadConfigStatusMap.general.syncId).toBeTruthy()
    expect(mockIsUploadConfigStatusMap.general.retryCount).toBe(0)
    expect(mockIsUploadConfigStatusMap.general.lastError).toBe('')
    expect(mockIsUploadConfigStatusMap.general.syncStatus).toBe('idle')
  })

  it('Branch 3 with local newer version → local as template preserves local new fields', async () => {
    const remoteSyncId = 'remote-sync-search'
    const cloudData = populateCloudData({
      // 云端 v2.2.5 缺少 isVoiceEnabled 字段
      search: { data: { isNewTabOpen: true }, appVersion: '2.2.5', syncId: remoteSyncId },
    })
    setupChromeSync(cloudData)

    mockIsUploadConfigStatusMap.search.syncId = 'local-old-search'
    mockIsUploadConfigStatusMap.search.dirty = false

    await loadRemoteConfig()

    const pendingConfig = (mockUpdateSetting.mock.calls[0] as [Record<string, any>])[0]
    // 本地较新 → 以本地为模板 → 保留本地新增字段 isVoiceEnabled
    expect(pendingConfig.search).toHaveProperty('isVoiceEnabled', true)
    expect(pendingConfig.search.isNewTabOpen).toBe(true)
  })

  it('Branch 3 remote newer version → remote as template preserves remote new fields', async () => {
    const remoteSyncId = 'remote-sync-search'
    const cloudData = populateCloudData({
      // 云端 v2.3.0 新增了 isVoiceEnabled 字段
      search: {
        data: { isNewTabOpen: false, isVoiceEnabled: true, newFeature: true },
        appVersion: '2.3.0',
        syncId: remoteSyncId,
      },
    })
    setupChromeSync(cloudData)

    mockIsUploadConfigStatusMap.search.syncId = 'local-old-search'
    mockIsUploadConfigStatusMap.search.dirty = false

    await loadRemoteConfig()

    const pendingConfig = (mockUpdateSetting.mock.calls[0] as [Record<string, any>])[0]
    // 云端较新 → 以云端为模板 → 保留云端新增字段
    expect(pendingConfig.search).toHaveProperty('newFeature', true)
    expect(pendingConfig.search.isNewTabOpen).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════
// Multi-device sync simulation scenarios
// ════════════════════════════════════════════════════════════

describe('multi-device sync scenarios', () => {
  beforeEach(() => {
    mockLog.mockClear()
    mockUpdateSetting.mockClear()
    resetMockState()
    window.appVersion = '2.3.0'
  })

  /**
   * SyncSimulator: 模拟多设备通过 chrome.storage.sync 交互
   *
   * 核心思路：云端数据是共享的，设备 A 上传后云端数据变化，
   * 设备 B 下次拉取时就能拿到 A 的数据。
   * 每个设备有独立的 localConfig 和 isUploadConfigStatusMap。
   */
  class SyncSimulator {
    cloudData: Record<string, string> = {}
    devices: Map<string, DeviceState> = new Map()
    _cloudVersion: number = 0 // syncTime 递增计数器

    constructor() {
      // 初始化云端为空
    }

    /**
     * 创建设备，给每个设备独立的 localConfig + statusMap
     */
    addDevice(name: string, version: string, syncIds: Record<string, string>) {
      const device: DeviceState = {
        name,
        version,
        localConfig: {},
        statusMap: {},
      }

      for (const [field, value] of Object.entries(CONFIG_FIELDS)) {
        device.localConfig[field] = { ...value }
        device.statusMap[field] = {
          loading: false,
          syncTime: 0,
          syncId: syncIds[field] ?? '',
          localModifiedTime: 0,
          dirty: false,
        }
      }

      this.devices.set(name, device)
      return device
    }

    /**
     * 设备修改某个字段（模拟用户操作）
     */
    modifyField(deviceName: string, field: string, data: Record<string, any>) {
      const device = this.devices.get(deviceName)!
      Object.assign(device.localConfig[field], data)
      device.statusMap[field].dirty = true
      device.statusMap[field].localModifiedTime = ++this._cloudVersion * 100000
    }

    /**
     * 设备上传：更新云端数据（模拟 uploadConfigFn 的上传行为）
     */
    uploadField(deviceName: string, field: string) {
      const device = this.devices.get(deviceName)!
      const config = device.localConfig[field]
      const syncId = `md5-${deviceName}-${field}-${this._cloudVersion}`
      const syncTime = ++this._cloudVersion * 100000
      this.cloudData[`naive-tab-${field}`] = JSON.stringify({
        syncTime,
        syncId,
        appVersion: device.version,
        data: config,
      })
      device.statusMap[field].syncId = syncId
      device.statusMap[field].syncTime = syncTime
      device.statusMap[field].dirty = false
      device.statusMap[field].loading = false
      this._cloudVersion++
    }

    /**
     * 设备拉取：模拟 loadRemoteConfig 对单个字段的处理
     * 返回 pendingConfig 和上传记录
     */
    pullField(deviceName: string, field: string): {
      mergedData: Record<string, any> | null
      uploaded: boolean
    } {
      const device = this.devices.get(deviceName)!
      const rawCloud = this.cloudData[`naive-tab-${field}`]
      const localSyncId = device.statusMap[field].syncId
      const localDirty = device.statusMap[field].dirty
      const localModifiedTime = device.statusMap[field].localModifiedTime
      const localConfig = device.localConfig[field]
      const localVersion = device.version

      // 云端无该字段
      if (!rawCloud) {
        // 应触发上传（初始化）
        return { mergedData: null, uploaded: true }
      }

      const target = JSON.parse(rawCloud)
      const targetSyncId = target.syncId
      const targetSyncTime = target.syncTime
      const targetAppVersion = target.appVersion || '0.0.0'
      const targetConfig = target.data

      // syncId 相同 → 跳过
      if (targetSyncId === localSyncId) {
        return { mergedData: null, uploaded: false }
      }

      // dirty = false → 版本感知合并
      if (!localDirty) {
        const merged = doMergeWithVersionAwareness(
          localConfig, targetConfig, localVersion, targetAppVersion,
        )
        device.statusMap[field].syncTime = targetSyncTime
        device.statusMap[field].syncId = targetSyncId
        // 同步后更新 localConfig
        Object.assign(device.localConfig[field], merged)
        return { mergedData: merged, uploaded: false }
      }

      // dirty = true, local 更新 → 上传
      if (localModifiedTime > targetSyncTime) {
        return { mergedData: null, uploaded: true }
      }

      // dirty = true, 云端更新 → 合并
      const merged = doMergeWithVersionAwareness(
        localConfig, targetConfig, localVersion, targetAppVersion,
      )
      device.statusMap[field].dirty = false
      device.statusMap[field].syncTime = targetSyncTime
      device.statusMap[field].syncId = targetSyncId
      Object.assign(device.localConfig[field], merged)
      return { mergedData: merged, uploaded: false }
    }
  }

  // 简化版 mergeConfigWithVersionAwareness（不依赖 mock，直接用纯函数逻辑）
  function doMergeWithVersionAwareness(
    localData: Record<string, any>,
    remoteData: Record<string, any>,
    localVersion: string,
    remoteVersion: string,
  ): Record<string, any> {
    if (localVersion === remoteVersion) {
      return remoteData
    }
    const isLocalNewer = compareVersion(remoteVersion, localVersion)
    if (isLocalNewer) {
      return mockMergeState(localData, remoteData) as Record<string, any>
    } else {
      return mockMergeState(remoteData, localData) as Record<string, any>
    }
  }

  function compareVersion(left: string, right: string): boolean {
    const l = left.split('.').map(Number)
    const r = right.split('.').map(Number)
    for (let i = 0; i < Math.max(l.length, r.length); i++) {
      if ((l[i] || 0) < (r[i] || 0)) return true
      if ((l[i] || 0) > (r[i] || 0)) return false
    }
    return false
  }

  interface DeviceState {
    name: string
    version: string
    localConfig: Record<string, any>
    statusMap: Record<string, {
      loading: boolean
      syncTime: number
      syncId: string
      localModifiedTime: number
      dirty: boolean
      retryCount?: number
      lastError?: string
      syncStatus?: string
    }>
  }

  // ── 场景 1：A 修改 → B 拉取 → B 拿到 A 的值 ──

  it('scenario 1: A modifies and uploads → B pulls and gets A\'s changes', () => {
    const sim = new SyncSimulator()
    const baseSyncId = 'base-sync'

    sim.addDevice('A', '2.3.0', {
      general: baseSyncId,
      keyboardBookmark: baseSyncId,
      search: baseSyncId,
    })
    const b = sim.addDevice('B', '2.3.0', {
      general: baseSyncId,
      keyboardBookmark: baseSyncId,
      search: baseSyncId,
    })

    // A 修改 general.lang
    sim.modifyField('A', 'general', { lang: 'en-US' })
    sim.uploadField('A', 'general')

    // B 拉取 general
    const result = sim.pullField('B', 'general')

    // A 和 B 初始 syncId 相同，但 A 上传后云端 syncId 变了
    // B 的 syncId 是 base-sync，云端是 A 的新 syncId → syncId 不同
    // B dirty = false → local clean → 版本相同 → use remote
    expect(result.mergedData).toHaveProperty('lang', 'en-US')
    expect(b.localConfig.general.lang).toBe('en-US')
    // B 的 syncId 应更新为 A 的
    expect(b.statusMap.general.syncId).toBe(sim.devices.get('A')!.statusMap.general.syncId)
  })

  // ── 场景 2：A 改 X，B 改 Y → 互不干扰 ──

  it('scenario 2: A modifies X, B modifies Y → no interference', () => {
    const sim = new SyncSimulator()
    const baseSyncId = 'base-sync'

    sim.addDevice('A', '2.3.0', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })
    sim.addDevice('B', '2.3.0', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })

    // A 修改 general.lang
    sim.modifyField('A', 'general', { lang: 'en-US' })
    sim.uploadField('A', 'general')

    // B 修改 search.isNewTabOpen
    sim.modifyField('B', 'search', { isNewTabOpen: true })
    sim.uploadField('B', 'search')

    // A 拉取 search
    const aPullSearch = sim.pullField('A', 'search')
    expect(aPullSearch.mergedData).toHaveProperty('isNewTabOpen', true)

    // B 拉取 general
    const bPullGeneral = sim.pullField('B', 'general')
    expect(bPullGeneral.mergedData).toHaveProperty('lang', 'en-US')

    // 验证互不干扰
    expect(sim.cloudData['naive-tab-general']).toContain('en-US')
    expect(sim.cloudData['naive-tab-search']).toContain('true')
  })

  // ── 场景 3：A 和 B 同改 X → last-write-wins ──

  it('scenario 3: A and B both modify X → last-write-wins by timestamp', () => {
    const sim = new SyncSimulator()
    const baseSyncId = 'base-sync'

    sim.addDevice('A', '2.3.0', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })
    sim.addDevice('B', '2.3.0', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })

    // A 先改 general.lang 并上传
    sim.modifyField('A', 'general', { lang: 'en-US' })
    sim.uploadField('A', 'general')

    // B 后改 general.lang（时间戳更晚）并上传
    sim.modifyField('B', 'general', { lang: 'fr-FR' })
    sim.uploadField('B', 'general')

    // A 拉取 general → B 的修改时间更晚，A 的 dirty = false
    // local clean → 版本相同 → use remote → B 的值
    const result = sim.pullField('A', 'general')
    expect(result.mergedData).toHaveProperty('lang', 'fr-FR')
  })

  // ── 场景 4：多轮 dirty 流转 ──
  // A 改 → B 拉 → B 改 → A 拉

  it('scenario 4: multi-round dirty propagation A→B→A', () => {
    const sim = new SyncSimulator()
    const baseSyncId = 'base-sync'

    sim.addDevice('A', '2.3.0', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })
    sim.addDevice('B', '2.3.0', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })

    // 第一轮：A 改 general.lang = 'en-US' 并上传
    sim.modifyField('A', 'general', { lang: 'en-US' })
    sim.uploadField('A', 'general')

    // B 拉取 general → 拿到 en-US
    sim.pullField('B', 'general')
    expect(sim.devices.get('B')!.localConfig.general.lang).toBe('en-US')

    // B 改 general.lang = 'de-DE' 并上传
    sim.modifyField('B', 'general', { lang: 'de-DE' })
    sim.uploadField('B', 'general')

    // A 拉取 general → 拿到 de-DE
    const result = sim.pullField('A', 'general')
    expect(result.mergedData).toHaveProperty('lang', 'de-DE')
  })

  // ── 场景 5：版本混配多轮同步 ──
  // A 升级 v2.3.0 改配置 → B 在 v2.2.5 也改配置 → B 升级到 v2.3.0 → B 拉取

  it('scenario 5: version-mixed multi-device sync A(v2.3.0) modifies → B(v2.2.5) modifies → B upgrades to v2.3.0', () => {
    const sim = new SyncSimulator()
    const baseSyncId = 'base-sync'

    sim.addDevice('A', '2.3.0', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })
    sim.addDevice('B', '2.2.5', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })

    // A 升级后修改 search 和 general
    sim.modifyField('A', 'search', { isNewTabOpen: true })
    sim.uploadField('A', 'search')
    sim.modifyField('A', 'general', { lang: 'en-US' })
    sim.uploadField('A', 'general')

    // B 在 v2.2.5 修改 general.lang（本地修改但不上传）
    sim.modifyField('B', 'general', { lang: 'ja-JP' })

    // B 升级到 v2.3.0
    sim.devices.get('B')!.version = '2.3.0'

    // B 拉取 search → 云端 v2.3.0 (A 上传的), 本地 v2.2.5, dirty=false
    // dirty=false → local clean → 版本不同 → local 较新
    // → mergeState(local, remote) → 以 local 为模板
    const resultSearch = sim.pullField('B', 'search')
    expect(resultSearch.mergedData).toHaveProperty('isNewTabOpen', true)
    // 以 B 的 local 为模板，保留 B 的 isVoiceEnabled
    expect(resultSearch.mergedData).toHaveProperty('isVoiceEnabled', true)

    // B 拉取 general → B dirty=true, localModifiedTime > cloud targetSyncTime
    // → 应上传本地配置（last-write-wins）
    const resultGeneral = sim.pullField('B', 'general')
    expect(resultGeneral.uploaded).toBe(true)
    expect(resultGeneral.mergedData).toBeNull()
  })

  // ── 场景 6：云端字段缺失 → 本地有但云端无（新设备首次初始化） ──

  it('scenario 6: new device initializes cloud data for missing fields', () => {
    const sim = new SyncSimulator()
    // 新设备：本地有默认配置，云端全部为空

    sim.addDevice('NewDevice', '2.3.0', {
      general: '',      // 空 syncId 表示从未同步过
      keyboardBookmark: '',
      search: '',
    })

    // 云端没有任何数据
    for (const field of Object.keys(CONFIG_FIELDS)) {
      const result = sim.pullField('NewDevice', field)
      // 云端无该字段 → 应触发上传
      expect(result.uploaded).toBe(true)
    }

    // 模拟上传完成后，云端应有数据
    for (const field of Object.keys(CONFIG_FIELDS)) {
      sim.uploadField('NewDevice', field)
    }

    // 验证云端数据存在
    for (const field of Object.keys(CONFIG_FIELDS)) {
      expect(sim.cloudData[`naive-tab-${field}`]).toBeDefined()
    }
  })

  // ── 场景 7：B 先改字段上传 → A 不改动拉取 → B 再升级改版本 ──
  // 验证 syncId 跨版本流转

  it('scenario 7: B uploads v2.2.5 data → A pulls at v2.3.0 → A gets B\'s data with version-aware merge', () => {
    const sim = new SyncSimulator()
    const baseSyncId = 'base-sync'

    sim.addDevice('A', '2.3.0', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })
    sim.addDevice('B', '2.2.5', { general: baseSyncId, keyboardBookmark: baseSyncId, search: baseSyncId })

    // B 在 v2.2.5 修改 general.lang 并上传（旧版 appVersion）
    sim.modifyField('B', 'general', { lang: 'ko-KR' })
    sim.uploadField('B', 'general')

    // A 在 v2.3.0 拉取 general
    // local dirty = false, syncId 不同, 版本不同 → local clean + version aware
    // A 版本较新 → 以 local 为模板，合并 B 的值
    const result = sim.pullField('A', 'general')
    expect(result.mergedData).toHaveProperty('lang', 'ko-KR')
    // A 的 version 保留（以 A 为模板）
    expect(result.mergedData).toHaveProperty('version', '2.3.0')
  })
})
