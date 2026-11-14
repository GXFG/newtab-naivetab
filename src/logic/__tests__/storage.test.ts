import { describe, it, expect, vi, beforeEach } from 'vitest'
import { showToast } from '@/common/toast'

vi.mock('@/common/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

/**
 * storage.test.ts — 测试 config/sync/manage.ts 中的 importSetting / exportSetting 数据迁移逻辑
 *
 * 使用全局单例对象模式：mock factory 直接内联定义对象，
 * 通过 exports 暴露给测试代码，测试代码通过修改这些对象重置状态。
 */

// Mock 定义必须使用内联对象字面量，避免 TDZ 和 hoisting 问题
vi.mock('@/logic/config/state', () => {
  const obj = {
    localConfig: {
      general: {
        version: '2.0.0',
        focusVisibleWidgetMap: {},
        openPageFocusElement: 'default',
        isFocusMode: false,
      },
      keyboardBookmark: { keymap: {}, source: 0 },
      keyboardCommon: { fontSize: 14, fontFamily: 'system' },
      keyboardCommand: { enabled: true },
      search: { isNewTabOpen: false },
      clockDigital: { fontSize: 28 },
      yearProgress: { enabled: true },
      calendar: { festivalCountdown: true, backgroundBlur: 0 },
      memo: { enabled: true, backgroundBlur: 0 },
      news: { enabled: true, backgroundBlur: 0 },
      bookmarkFolder: { enabled: false },
      clockFlip: { enabled: false },
    },
    localState: { value: { isUploadConfigStatusMap: {}, isFocusMode: false } },
    globalState: {
      isImportSettingLoading: false,
      isClearStorageLoading: false,
    },
    switchSettingDrawerVisible: vi.fn(),
  }
  // 暴露到 globalThis 供测试访问
  ;(globalThis as any).__mockStore = obj
  return obj
})

vi.mock('@/logic/config/defaults', () => ({
  defaultConfig: {
    general: { version: '2.2.5' },
    keyboardBookmark: { keymap: {}, source: 1 },
    keyboardCommon: { fontSize: 14, fontFamily: 'system' },
    keyboardCommand: { enabled: true },
    search: { isNewTabOpen: true },
    clockDigital: { fontSize: 28 },
    yearProgress: { enabled: true },
    calendar: { festivalCountdown: true, backgroundBlur: 0 },
    memo: { enabled: true, backgroundBlur: 0 },
    news: { enabled: true, backgroundBlur: 0 },
    bookmarkFolder: { enabled: false },
    clockFlip: { enabled: false },
  },
  defaultUploadStatusItem: {
    loading: false,
    syncTime: 0,
    syncId: '',
    localModifiedTime: 0,
    dirty: false,
  },
  // 迁移步骤表在模块作用域读取这两个导出
  defaultFocusVisibleWidgetMap: { search: true, keyboardBookmark: true },
  KEYBOARD_COMMON_CONFIG: {
    keyboardType: 'key67',
    splitSpace: 'space1',
    keyboardWklMode: false,
    keycapType: 'gmk',
    keycapPadding: 1.5,
    keycapSize: 58,
    keycapBorderRadius: 5,
    isKeycapBorderEnabled: false,
    keycapBorderWidth: 1,
    keycapBorderColor: [],
    isShellVisible: true,
    shellVerticalPadding: 15,
    shellHorizontalPadding: 15,
    shellBorderRadius: 10,
    shellColor: [],
    isShellShadowEnabled: true,
    shellShadowColor: [],
    shellBackgroundBlur: 5,
    isPlateVisible: true,
    platePadding: 3,
    plateBorderRadius: 5,
    plateColor: [],
    isCapKeyVisible: true,
    keycapKeyFontFamily: 'OpenCherry',
    keycapKeyFontSize: 12,
    isNameVisible: true,
    keycapBookmarkFontFamily: 'Arial',
    keycapBookmarkFontSize: 11,
    isFaviconVisible: true,
    faviconSize: 0.85,
    isTactileBumpsVisible: true,
    mainFontColor: [],
    mainBackgroundColor: [],
    emphasisOneFontColor: [],
    emphasisOneBackgroundColor: [],
    emphasisTwoFontColor: [],
    emphasisTwoBackgroundColor: [],
    emphasisKeyOverrides: {},
    fontSize: 14,
    fontFamily: 'system',
  },
  KEYBOARD_COMMAND_CONFIG: {
    isEnabled: true,
    noModifierMode: false,
    shortcutInInputElement: true,
    urlBlacklist: [],
    modifiers: ['shift', 'alt'],
    keymap: {},
  },
}))

vi.mock('@/logic/utils/util', () => ({
  log: vi.fn(),
  compareLeftVersionLessThanRightVersions: vi.fn(
    (left: string, right: string) => {
      const l = left.split('.').map(Number)
      const r = right.split('.').map(Number)
      for (let i = 0; i < Math.max(l.length, r.length); i++) {
        if ((l[i] || 0) < (r[i] || 0)) return true
        if ((l[i] || 0) > (r[i] || 0)) return false
      }
      return false
    },
  ),
  sleep: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/logic/config/compress', () => ({
  COMPRESS_PREFIX: 'gzip:',
  compressString: vi.fn().mockResolvedValue('compressed'),
  decompressString: vi.fn().mockResolvedValue('{}'),
  shouldCompress: vi.fn().mockReturnValue(false),
  parseStoredData: vi.fn().mockResolvedValue({
    syncTime: 0,
    syncId: 'x',
    appVersion: '2.0.0',
    data: {},
  }),
}))

vi.mock('@/logic/config/merge', () => ({
  mergeState: vi.fn((s: unknown, a: unknown) => a ?? s),
}))

vi.mock('@/logic/config/update', () => ({
  handleStateResetAndUpdate: vi.fn(),
  handleAppUpdate: vi.fn(),
  updateSetting: vi.fn().mockImplementation(async (acceptState: any) => {
    // Apply the migrated fileContent to the mock localConfig so tests can verify
    if (acceptState) {
      const mock = (globalThis as any).__mockStore
      for (const field of Object.keys(acceptState)) {
        if (mock.localConfig[field]) {
          Object.assign(mock.localConfig[field], acceptState[field])
        }
      }
    }
    return true
  }),
}))

vi.mock('@/logic/utils/database', () => ({
  clearDatabase: vi.fn().mockResolvedValue(undefined),
}))

// 上传引擎单独测试（upload-and-recovery.test.ts），这里只验证导入后的同步状态与调用关系
const uploadMock = vi.hoisted(() => ({
  flushConfigSync: vi.fn().mockResolvedValue(true),
  cancelAllDebounce: vi.fn(),
  waitForUploadsIdle: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/logic/config/sync/upload', () => uploadMock)

vi.mock('@/logic/keyboard/keyboard-constants', () => ({
  KEYBOARD_URL_MAX_LENGTH: 200,
  KEYBOARD_NAME_MAX_LENGTH: 10,
}))

vi.mock('@/logic/constants/app', () => ({
  MERGE_CONFIG_DELAY: 2000,
  MERGE_CONFIG_MAX_DELAY: 5000,
}))

vi.mock('@vueuse/core', () => ({
  useDebounceFn: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}))

import {
  importSetting,
  exportSetting,
  refreshSetting,
  resetSetting,
} from '@/logic/config/sync/manage'

// Access mock state from globalThis (set by the mock factory)
const getMock = () => (globalThis as any).__mockStore

function resetMockState() {
  const m = getMock()
  m.localConfig.general.version = '2.0.0'
  m.localConfig.general.focusVisibleWidgetMap = {}
  m.localConfig.general.openPageFocusElement = 'default'
  m.localConfig.general.isFocusMode = false
  m.localConfig.keyboardBookmark.keymap = {}
  m.localConfig.keyboardBookmark.source = 0
  m.localConfig.keyboardCommon.fontSize = 14
  m.localConfig.keyboardCommon.fontFamily = 'system'
  m.localConfig.keyboardCommand.enabled = true
  m.localConfig.search.isNewTabOpen = false
  m.localConfig.clockDigital.fontSize = 28
  m.localConfig.yearProgress.enabled = true
  m.localConfig.calendar.festivalCountdown = true
  m.localConfig.calendar.backgroundBlur = 0
  m.localConfig.memo.enabled = true
  m.localConfig.memo.backgroundBlur = 0
  m.localConfig.news.enabled = true
  m.localConfig.news.backgroundBlur = 0
  m.localConfig.bookmarkFolder.enabled = false
  m.localConfig.clockFlip.enabled = false
  m.localState.value = { isUploadConfigStatusMap: {}, isFocusMode: false }
  m.globalState.isImportSettingLoading = false
  m.globalState.isClearStorageLoading = false
}

describe('importSetting migrations', () => {
  beforeEach(() => {
    resetMockState()
    vi.clearAllMocks()
    window.appVersion = '2.2.5'
  })

  it('migrates bookmark key to keyboardBookmark (v1.27.0 前格式)', async () => {
    const oldFormat = {
      general: { version: '1.26.0' },
      bookmark: { keymap: { KeyA: { url: 'https://example.com' } } },
    }
    await importSetting(JSON.stringify(oldFormat))
    expect(getMock().localConfig.keyboardBookmark.keymap).toHaveProperty('KeyA')
  })

  it('migrates keyboard key to keyboardBookmark', async () => {
    const oldFormat = {
      general: { version: '1.26.0' },
      keyboard: { keymap: { KeyB: { url: 'https://test.com' } } },
    }
    await importSetting(JSON.stringify(oldFormat))
    expect(getMock().localConfig.keyboardBookmark.keymap).toHaveProperty('KeyB')
  })

  it('migrates commandShortcut key to keyboardCommand', async () => {
    const oldFormat = {
      general: { version: '2.2.0' },
      commandShortcut: { enabled: true },
    }
    await importSetting(JSON.stringify(oldFormat))
    expect(getMock().localConfig.keyboardCommand.enabled).toBe(true)
  })

  it('splits keyboard appearance fields to keyboardCommon', async () => {
    const oldFormat = {
      general: { version: '2.2.0' },
      keyboardBookmark: { keymap: {}, fontSize: 16, fontFamily: 'Arial' },
    }
    await importSetting(JSON.stringify(oldFormat))
    expect(getMock().localConfig.keyboardCommon.fontSize).toBe(16)
    expect(getMock().localConfig.keyboardCommon.fontFamily).toBe('Arial')
  })

  it('fixes openPageFocusElement from keyboard to keyboardBookmark', async () => {
    const oldFormat = {
      general: {
        version: '2.2.0',
        openPageFocusElement: 'keyboard',
        focusVisibleWidgetMap: {},
      },
    }
    await importSetting(JSON.stringify(oldFormat))
    expect(getMock().localConfig.general.openPageFocusElement).toBe(
      'keyboardBookmark',
    )
  })

  it('migrates focusVisibleWidgetMap key renames', async () => {
    const oldFormat = {
      general: {
        version: '2.2.0',
        focusVisibleWidgetMap: { keyboard: true, commandShortcut: true },
      },
    }
    await importSetting(JSON.stringify(oldFormat))
    expect(
      getMock().localConfig.general.focusVisibleWidgetMap.keyboardBookmark,
    ).toBe(true)
    expect(
      getMock().localConfig.general.focusVisibleWidgetMap.keyboardCommand,
    ).toBe(true)
  })

  it('discards isFocusMode from imported config', async () => {
    // 配置文件只描述 config，不描述本机运行时状态：导入不再改写 localState
    const oldFormat = {
      general: { version: '2.2.0', isFocusMode: true },
    }
    await importSetting(JSON.stringify(oldFormat))
    // 本机现值保持 false（既有字段不会被导入的数据覆盖）
    expect(getMock().localState.value.isFocusMode).toBe(false)
    expect(getMock().localConfig.general.isFocusMode).toBe(false)
  })

  it('updates version to current appVersion', async () => {
    const oldFormat = { general: { version: '1.20.0' } }
    await importSetting(JSON.stringify(oldFormat))
    expect(getMock().localConfig.general.version).toBe('2.2.5')
  })

  it('skips keyboard migration when keyboardBookmark already exists', async () => {
    // keyboard → keyboardBookmark 迁移仅在 keyboardBookmark 不存在时触发
    const oldFormat = {
      general: { version: '2.2.0' },
      keyboardBookmark: { keymap: { KeyA: { url: 'https://existing.com' } } },
      keyboard: { keymap: { KeyB: { url: 'https://migrated.com' } } },
    }
    await importSetting(JSON.stringify(oldFormat))
    // keyboardBookmark 已存在，keyboard 不会被迁移
    expect(getMock().localConfig.keyboardBookmark.keymap).toHaveProperty('KeyA')
    expect(getMock().localConfig.keyboardBookmark.keymap).not.toHaveProperty(
      'KeyB',
    )
  })

  it('preserves existing new keys in focusVisibleWidgetMap during migration', async () => {
    // 当旧数据同时包含旧 key (keyboard) 和新 key (keyboardBookmark) 时
    // 迁移逻辑应该不覆盖已存在的新 key
    const oldFormat = {
      general: {
        version: '2.2.0',
        focusVisibleWidgetMap: {
          keyboard: true, // 旧 key，会被改为 keyboardBookmark
          keyboardBookmark: true, // 新 key，已存在
          search: true, // 其他正常 key
        },
      },
    }
    await importSetting(JSON.stringify(oldFormat))
    const fvm = getMock().localConfig.general.focusVisibleWidgetMap
    expect(fvm.keyboardBookmark).toBe(true)
    expect(fvm.search).toBe(true)
  })

  it('imports full nested config with deep structure', async () => {
    // 使用接近真实结构的配置导入，验证多层嵌套不被破坏
    const fullConfig = {
      general: {
        version: '2.1.0',
        lang: 'zh-CN',
        appearance: 'auto',
        focusVisibleWidgetMap: { search: true, clockDigital: true },
      },
      keyboardBookmark: {
        keymap: {
          KeyA: { url: 'https://google.com', name: 'Google' },
          Digit1: { url: 'https://github.com', name: 'GitHub' },
        },
        source: 2,
      },
      search: { isNewTabOpen: true, isVoiceEnabled: true },
    }
    await importSetting(JSON.stringify(fullConfig))
    const m = getMock().localConfig
    expect(m.general.lang).toBe('zh-CN')
    expect(m.keyboardBookmark.keymap.KeyA.name).toBe('Google')
    expect(m.keyboardBookmark.source).toBe(2)
    expect(m.search.isNewTabOpen).toBe(true)
  })
})

describe('importSetting cloud sync', () => {
  beforeEach(() => {
    resetMockState()
    vi.clearAllMocks()
    window.appVersion = '2.2.5'
  })

  it('keeps cloud syncId and marks dirty so the import is pushed to cloud', async () => {
    // 回归用例：导入后把 syncId 写成「本地内容指纹」+ dirty=false，会让下次启动的
    // loadRemoteConfig 误判「本地干净 + 版本相同 → 用云端」，导入结果被旧云端数据回滚。
    const m = getMock()
    m.localState.value.isUploadConfigStatusMap = {
      general: {
        loading: false,
        syncTime: 1000,
        syncId: 'cloud-old-md5',
        localModifiedTime: 0,
        dirty: false,
        retryCount: 3,
        lastError: 'previous',
        syncStatus: 'failed',
      },
    }

    await importSetting(
      JSON.stringify({ general: { version: '2.0.0', lang: 'en-US' } }),
    )

    const status = m.localState.value.isUploadConfigStatusMap.general
    expect(m.localConfig.general.lang).toBe('en-US')
    // syncId 必须保持云端值，否则 uploadConfigFn 的指纹去重会直接跳过一次必要的上传
    expect(status.syncId).toBe('cloud-old-md5')
    expect(status.dirty).toBe(true)
    expect(status.localModifiedTime).toBeGreaterThan(0)
    // 手动操作重置重试配额
    expect(status.retryCount).toBe(0)
    expect(status.lastError).toBe('')
  })

  it('flushes every config field to cloud after import', async () => {
    await importSetting(JSON.stringify({ general: { version: '2.0.0' } }))

    const flushedFields = uploadMock.flushConfigSync.mock.calls.map(
      (call: unknown[]) => call[0],
    )
    expect(flushedFields).toContain('general')
    expect(flushedFields).toContain('keyboardBookmark')
    expect(flushedFields.length).toBe(Object.keys(getMock().localConfig).length)
  })
})

describe('importSetting 结构校验', () => {
  beforeEach(() => {
    resetMockState()
    vi.clearAllMocks()
    window.appVersion = '2.2.5'
  })

  it('拒绝数组形式的 JSON 并给出失败提示', async () => {
    const m = getMock()
    const before = JSON.stringify(m.localConfig)

    await importSetting(JSON.stringify([{ general: { version: '2.0.0' } }]))

    expect(showToast.error).toHaveBeenCalled()
    // 配置不能被改动，也不能触发任何上传
    expect(JSON.stringify(m.localConfig)).toBe(before)
    expect(uploadMock.flushConfigSync).not.toHaveBeenCalled()
    expect(m.globalState.isImportSettingLoading).toBe(false)
  })

  it('缺少 general.version 时给出失败提示而不是静默返回', async () => {
    await importSetting(JSON.stringify({ search: { isNewTabOpen: true } }))

    expect(showToast.error).toHaveBeenCalled()
  })
})

describe('importSetting error handling', () => {
  beforeEach(() => {
    resetMockState()
    vi.clearAllMocks()
    window.appVersion = '2.2.5'
  })

  it('handles empty input gracefully', async () => {
    await importSetting('')
    expect(getMock().globalState.isImportSettingLoading).toBe(false)
  })

  it('handles invalid JSON gracefully', async () => {
    await importSetting('not json')
    expect(getMock().globalState.isImportSettingLoading).toBe(false)
  })

  it('handles empty object gracefully', async () => {
    await importSetting('{}')
    expect(getMock().globalState.isImportSettingLoading).toBe(false)
  })

  it('handles missing version gracefully', async () => {
    await importSetting(JSON.stringify({ general: {} }))
    expect(getMock().globalState.isImportSettingLoading).toBe(false)
  })
})

describe('exportSetting', () => {
  beforeEach(() => {
    resetMockState()
    vi.clearAllMocks()
  })

  it('shows success message', async () => {
    await exportSetting()
    expect(showToast.success).toHaveBeenCalled()
  })
})

describe('清空类操作的上传竞态防护', () => {
  beforeEach(() => {
    resetMockState()
    vi.clearAllMocks()
    window.appVersion = '2.2.5'
  })

  it('resetSetting 先取消防抖并等待进行中的上传，再清空 chrome.storage.sync', async () => {
    const order: string[] = []
    uploadMock.cancelAllDebounce.mockImplementation(() => {
      order.push('cancel')
    })
    uploadMock.waitForUploadsIdle.mockImplementation(async () => {
      order.push('wait-idle')
    })
    ;(chrome.storage.sync.clear as any).mockImplementation(() => {
      order.push('sync.clear')
    })

    await resetSetting()

    // 顺序反了就会出现「重置后又变回旧配置」：迟到的 set 回调把数据写回去
    expect(order).toEqual(['cancel', 'wait-idle', 'sync.clear'])
  })

  it('refreshSetting 先等上传落盘，再清空 localStorage', async () => {
    const order: string[] = []
    uploadMock.cancelAllDebounce.mockImplementation(() => {
      order.push('cancel')
    })
    uploadMock.waitForUploadsIdle.mockImplementation(async () => {
      order.push('wait-idle')
    })
    // 监视实例而非 Storage.prototype：happy-dom 的 localStorage 是 Proxy，
    // 其方法由 getter 返回绑定函数，与 Storage.prototype.clear 不是同一引用
    const clearSpy = vi.spyOn(localStorage, 'clear').mockImplementation(() => {
      order.push('localStorage.clear')
    })

    await refreshSetting()

    expect(order).toEqual(['cancel', 'wait-idle', 'localStorage.clear'])
    clearSpy.mockRestore()
  })
})
