import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * storage.test.ts — 测试 sync/manage.ts 中的 importSetting / exportSetting 数据迁移逻辑
 *
 * 使用全局单例对象模式：mock factory 直接内联定义对象，
 * 通过 exports 暴露给测试代码，测试代码通过修改这些对象重置状态。
 */

// Mock 定义必须使用内联对象字面量，避免 TDZ 和 hoisting 问题
vi.mock('@/logic/store', () => {
  const obj = {
    localConfig: {
      general: {
        version: '2.0.0',
        focusVisibleWidgetMap: {},
        openPageFocusElement: 'default',
        isFocusMode: false,
      },
      keyboardBookmark: { keymap: {}, source: 0, defaultExpandFolder: null },
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
    keyboardBookmark: { keymap: {}, source: 1, defaultExpandFolder: null },
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
}))

vi.mock('@/logic/util', () => ({
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
  downloadJsonByTagA: vi.fn(),
  sleep: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/logic/compress', () => ({
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

vi.mock('@/logic/database', () => ({
  clearDatabase: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/logic/keyboard/keyboard-constants', () => ({
  KEYBOARD_URL_MAX_LENGTH: 200,
  KEYBOARD_NAME_MAX_LENGTH: 10,
}))

vi.mock('@/logic/keyboard/keyboard-config', () => ({
  KEYBOARD_COMMON_CONFIG: { fontSize: 14, fontFamily: 'system' },
}))

vi.mock('@/logic/constants/app', () => ({
  MERGE_CONFIG_DELAY: 2000,
  MERGE_CONFIG_MAX_DELAY: 5000,
}))

vi.mock('@vueuse/core', () => ({
  useDebounceFn: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}))

vi.mock('crypto-js/md5', () => ({
  default: vi.fn((str: string) => ({ toString: () => `md5-${str.length}` })),
}))

import { importSetting, exportSetting } from '@/logic/sync/manage'
import { downloadJsonByTagA } from '@/logic/util'

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
  m.localConfig.keyboardBookmark.defaultExpandFolder = null
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

  it('migrates isFocusMode from general to localState', async () => {
    const oldFormat = {
      general: { version: '2.2.0', isFocusMode: true },
    }
    await importSetting(JSON.stringify(oldFormat))
    expect(getMock().localState.value.isFocusMode).toBe(true)
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
    expect(getMock().localConfig.keyboardBookmark.keymap).not.toHaveProperty('KeyB')
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
        defaultExpandFolder: 'work',
      },
      search: { isNewTabOpen: true, isVoiceEnabled: true },
    }
    await importSetting(JSON.stringify(fullConfig))
    const m = getMock().localConfig
    expect(m.general.lang).toBe('zh-CN')
    expect(m.keyboardBookmark.keymap.KeyA.name).toBe('Google')
    expect(m.keyboardBookmark.source).toBe(2)
    expect(m.keyboardBookmark.defaultExpandFolder).toBe('work')
    expect(m.search.isNewTabOpen).toBe(true)
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

  it('calls downloadJsonByTagA with localConfig', async () => {
    await exportSetting()
    expect(downloadJsonByTagA).toHaveBeenCalled()
  })

  it('shows success message', async () => {
    await exportSetting()
    expect(window.$message.success).toHaveBeenCalled()
  })
})
