import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * handle-app-update.test.ts — 测试 config/update.ts 中的 handleAppUpdate
 *
 * 覆盖所有版本迁移分支（v1.20.0 → v2.2.2），验证：
 * - 新增字段正确赋默认值
 * - 重命名字段正确迁移
 * - 删除字段被清理
 * - 嵌套对象结构正确升级
 * - localStorage 旧数据迁移
 */

// Mock 数据（可变引用，每个测试重置）
const mockLocalConfig: Record<string, any> = {}
const mockLocalState: { value: Record<string, any> } = { value: {} }
const mockGlobalState: Record<string, any> = {}

function resetMockState() {
  Object.assign(mockLocalConfig, {
    general: {
      version: '1.0.0',
      lang: 'zh-CN',
      timeLang: '',
      openPageFocusElement: 'default',
      focusVisibleWidgetMap: {},
      showBreakingChangeNotice: false,
    },
    keyboardBookmark: {
      keymap: {},
      source: 0,
    },
    keyboardCommon: { fontSize: 14, fontFamily: 'system' },
    keyboardCommand: { enabled: true, modifierKeys: [] },
    search: { isNewTabOpen: false, backgroundBlur: 0 },
    clockDigital: { fontSize: 28 },
    yearProgress: { enabled: false },
    calendar: {
      festivalCountdown: false,
      backgroundBlur: 0,
      dayFontFamily: 'Arial',
      descFontFamily: 'Arial',
    },
    memo: { enabled: true, backgroundBlur: 0 },
    news: { enabled: true, backgroundBlur: 0 },
    bookmarkFolder: { enabled: false },
    clockFlip: { enabled: false },
  })

  mockLocalState.value = {
    isUploadConfigStatusMap: { general: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false } },
    isFocusMode: false,
  }

  mockGlobalState.isChangelogModalVisible = false
}

vi.doMock('@/logic/config/state', () => ({
  localConfig: mockLocalConfig,
  localState: mockLocalState,
}))
vi.doMock('@/logic/store/state', () => ({
  globalState: mockGlobalState,
}))

vi.doMock('@/logic/config/defaults', () => ({
  defaultConfig: {
    general: { version: '2.3.0', lang: 'zh-CN', timeLang: 'zh-CN', openPageFocusElement: 'default', focusVisibleWidgetMap: { search: true }, backgroundColor: ['rgba(232, 236, 241, 1)', 'rgba(26, 26, 46, 1)'] },
    keyboardBookmark: { keymap: {}, source: 1 },
    keyboardCommon: { fontSize: 14, fontFamily: 'system' },
    keyboardCommand: { enabled: true, modifierKeys: [] },
    search: { isNewTabOpen: false, backgroundBlur: 0 },
    clockDigital: { fontSize: 28, width: 22 },
    yearProgress: { enabled: true, backgroundBlur: 0 },
    calendar: { festivalCountdown: true, backgroundBlur: 0, dayFontFamily: 'system', descFontFamily: 'system' },
    memo: { enabled: true, backgroundBlur: 0 },
    news: { enabled: true, backgroundBlur: 0 },
    bookmarkFolder: { enabled: false },
    clockFlip: { enabled: false },
  },
  defaultFocusVisibleWidgetMap: { search: true, keyboardBookmark: true },
}))

vi.doMock('@/logic/config/merge', () => ({
  mergeState: vi.fn((state: unknown, acceptState: unknown) => acceptState ?? state),
}))

vi.doMock('@/logic/utils/util', () => ({
  log: vi.fn(),
  compareLeftVersionLessThanRightVersions: (left: string, right: string) => {
    const l = left.split('.').map(Number)
    const r = right.split('.').map(Number)
    for (let i = 0; i < Math.max(l.length, r.length); i++) {
      if ((l[i] || 0) < (r[i] || 0)) return true
      if ((l[i] || 0) > (r[i] || 0)) return false
    }
    return false
  },
}))


// localStorage mock
const localStorageMock: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { localStorageMock[key] = value }),
    removeItem: vi.fn((key: string) => { delete localStorageMock[key] }),
    clear: vi.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]) }),
  },
  configurable: true,
})

let handleAppUpdate: () => void
let getLocalVersion: () => string

beforeEach(async () => {
  vi.resetModules()
  localStorageMock['__cleared__'] = ''
  Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
  resetMockState()

  window.appVersion = '2.3.0'
  window.$t = vi.fn((key: string) => key)
  window.$notification = { success: vi.fn() } as any

  const mod = await import('@/logic/config/update')
  handleAppUpdate = mod.handleAppUpdate
  getLocalVersion = mod.getLocalVersion
})

// ── 基础：getLocalVersion ──

describe('getLocalVersion', () => {
  it('returns version from localStorage c-general', () => {
    localStorageMock['c-general'] = JSON.stringify({ version: '1.25.0' })
    expect(getLocalVersion()).toBe('1.25.0')
  })

  it('falls back to localConfig.general.version when localStorage is empty', () => {
    expect(getLocalVersion()).toBe('1.0.0')
  })

  it('falls back to "0" when both sources are empty', () => {
    mockLocalConfig.general.version = ''
    expect(getLocalVersion()).toBe('0')
  })
})

// ── 基础：版本无升级时跳过 ──

describe('handleAppUpdate: no upgrade', () => {
  it('returns early when local version >= appVersion', () => {
    mockLocalConfig.general.version = '2.3.0'
    handleAppUpdate()
    expect(mockGlobalState.isChangelogModalVisible).toBe(false)
  })
})


describe('handleAppUpdate: v1.20.0 migration', () => {
  beforeEach(() => { mockLocalConfig.general.version = '1.19.0' })

  it('sets keyboardBookmark.source to 1 when keymap is empty', () => {
    mockLocalConfig.keyboardBookmark.keymap = {}
    handleAppUpdate()
    expect(mockLocalConfig.keyboardBookmark.source).toBe(1)
  })

  it('sets keyboardBookmark.source to 2 when keymap has entries', () => {
    mockLocalConfig.keyboardBookmark.keymap = { KeyA: { url: 'https://example.com' } }
    handleAppUpdate()
    expect(mockLocalConfig.keyboardBookmark.source).toBe(2)
  })
})

// ── v1.23.1: clockDigital width 计算 + 删除 letterSpacing ──

describe('handleAppUpdate: v1.23.1 migration', () => {
  beforeEach(() => { mockLocalConfig.general.version = '1.23.0' })

  it('calculates width from fontSize / 2 + 8', () => {
    mockLocalConfig.clockDigital.fontSize = 28
    handleAppUpdate()
    expect(mockLocalConfig.clockDigital.width).toBe(28 / 2 + 8) // 22
  })

  it('deletes letterSpacing field', () => {
    ;(mockLocalConfig.clockDigital as any).letterSpacing = 2
    handleAppUpdate()
    expect((mockLocalConfig.clockDigital as any).letterSpacing).toBeUndefined()
  })
})

// ── v1.24.0: timeLang 迁移 + yearProgress 初始化 ──

describe('handleAppUpdate: v1.24.0 migration', () => {
  beforeEach(() => { mockLocalConfig.general.version = '1.23.9' })

  it('copies lang to timeLang', () => {
    mockLocalConfig.general.lang = 'en-US'
    handleAppUpdate()
    expect(mockLocalConfig.general.timeLang).toBe('en-US')
  })

  it('initializes yearProgress from defaultConfig', () => {
    handleAppUpdate()
    expect(mockLocalConfig.yearProgress.enabled).toBe(true)
  })
})

// ── v1.24.3: backgroundColor 初始化 ──

describe('handleAppUpdate: v1.24.3 migration', () => {
  beforeEach(() => { mockLocalConfig.general.version = '1.24.2' })

  it('sets backgroundColor from defaultConfig', () => {
    // 确保原来没有
    delete mockLocalConfig.general.backgroundColor
    handleAppUpdate()
    // updateSetting 会通过 mergeState 补充默认字段
    // 迁移分支直接赋值 + updateSetting 兜底
    expect(mockLocalConfig.general.backgroundColor).toBeDefined()
  })
})

// ── v1.25.9: calendar.festivalCountdown ──

describe('handleAppUpdate: v1.25.9 migration', () => {
  beforeEach(() => { mockLocalConfig.general.version = '1.25.8' })

  it('enables festivalCountdown', () => {
    mockLocalConfig.calendar.festivalCountdown = false
    handleAppUpdate()
    expect(mockLocalConfig.calendar.festivalCountdown).toBe(true)
  })
})

// ── v1.27.0: 重大变更（专注模式、背景模糊、书签文件夹） ──

describe('handleAppUpdate: v1.27.0 migration', () => {
  beforeEach(() => { mockLocalConfig.general.version = '1.26.0' })

  it('initializes isFocusMode to false', () => {
    handleAppUpdate()
    expect(mockLocalState.value.isFocusMode).toBe(false)
  })

  it('sets focusVisibleWidgetMap from default', () => {
    mockLocalConfig.general.focusVisibleWidgetMap = { old: true }
    handleAppUpdate()
    expect(mockLocalConfig.general.focusVisibleWidgetMap).toEqual(
      { search: true, keyboardBookmark: true },
    )
  })

  it('corrects openPageFocusElement from bookmarkKeyboard to keyboardBookmark', () => {
    mockLocalConfig.general.openPageFocusElement = 'bookmarkKeyboard'
    handleAppUpdate()
    expect(mockLocalConfig.general.openPageFocusElement).toBe('keyboardBookmark')
  })

  it('does not change openPageFocusElement when already correct', () => {
    mockLocalConfig.general.openPageFocusElement = 'search'
    handleAppUpdate()
    expect(mockLocalConfig.general.openPageFocusElement).toBe('search')
  })

  it('initializes backgroundBlur for all widgets that have the field', () => {
    handleAppUpdate()
    expect(mockLocalConfig.calendar.backgroundBlur).toBe(0)
    expect(mockLocalConfig.memo.backgroundBlur).toBe(0)
    expect(mockLocalConfig.news.backgroundBlur).toBe(0)
    expect(mockLocalConfig.yearProgress.backgroundBlur).toBe(0)
    // search 不在 v1.27.0 的迁移列表中（源码验证）
  })

  it('disables bookmarkFolder by default', () => {
    mockLocalConfig.bookmarkFolder.enabled = true
    handleAppUpdate()
    expect(mockLocalConfig.bookmarkFolder.enabled).toBe(false)
  })
})

// ── v2.0.0: clockFlip 初始化 ──

describe('handleAppUpdate: v2.0.0 migration', () => {
  beforeEach(() => { mockLocalConfig.general.version = '1.99.0' })

  it('initializes clockFlip.enabled to false', () => {
    mockLocalConfig.clockFlip.enabled = true
    handleAppUpdate()
    expect(mockLocalConfig.clockFlip.enabled).toBe(false)
  })
})

// ── v2.2.0: 全局快捷键 + 字体迁移 ──

describe('handleAppUpdate: v2.2.0 migration', () => {
  beforeEach(() => { mockLocalConfig.general.version = '2.1.0' })

  it('migrates isGlobalShortcutEnabled from old key', () => {
    ;(mockLocalConfig.keyboardBookmark as any).isListenBackgroundKeystrokes = false
    handleAppUpdate()
    expect(mockLocalConfig.keyboardBookmark.isGlobalShortcutEnabled).toBe(false)
  })

  it('defaults isGlobalShortcutEnabled to true when old key is missing', () => {
    handleAppUpdate()
    expect(mockLocalConfig.keyboardBookmark.isGlobalShortcutEnabled).toBe(true)
  })

  it('sets showBreakingChangeNotice to true', () => {
    handleAppUpdate()
    expect(mockLocalConfig.general.showBreakingChangeNotice).toBe(true)
  })

  it('migrates fontFamily from Arial to system across all widgets', () => {
    mockLocalConfig.general.fontFamily = 'Arial'
    mockLocalConfig.memo.fontFamily = 'Arial'
    mockLocalConfig.yearProgress.fontFamily = 'Arial'
    mockLocalConfig.calendar.fontFamily = 'Arial'
    mockLocalConfig.bookmarkFolder.fontFamily = 'Arial'
    mockLocalConfig.search.fontFamily = 'Arial'
    mockLocalConfig.news.fontFamily = 'Arial'
    handleAppUpdate()
    expect(mockLocalConfig.general.fontFamily).toBe('system')
    expect(mockLocalConfig.memo.fontFamily).toBe('system')
    expect(mockLocalConfig.search.fontFamily).toBe('system')
  })

  it('keeps non-Arial fontFamily unchanged', () => {
    mockLocalConfig.general.fontFamily = 'Roboto'
    handleAppUpdate()
    expect(mockLocalConfig.general.fontFamily).toBe('Roboto')
  })

  it('migrates calendar dayFontFamily from Arial to system', () => {
    mockLocalConfig.calendar.dayFontFamily = 'Arial'
    handleAppUpdate()
    expect(mockLocalConfig.calendar.dayFontFamily).toBe('system')
  })

  it('migrates calendar descFontFamily from Arial to system', () => {
    mockLocalConfig.calendar.descFontFamily = 'Arial'
    handleAppUpdate()
    expect(mockLocalConfig.calendar.descFontFamily).toBe('system')
  })
})

// ── v2.2.2: focusVisibleWidgetMap 更新 + localStorage 迁移 ──

describe('handleAppUpdate: v2.2.2 migration', () => {
  beforeEach(() => { mockLocalConfig.general.version = '2.2.1' })

  it('resets focusVisibleWidgetMap to default', () => {
    mockLocalConfig.general.focusVisibleWidgetMap = { oldKey: true }
    handleAppUpdate()
    expect(mockLocalConfig.general.focusVisibleWidgetMap).toEqual(
      { search: true, keyboardBookmark: true },
    )
  })

  it('corrects openPageFocusElement from keyboard to keyboardBookmark', () => {
    mockLocalConfig.general.openPageFocusElement = 'keyboard'
    handleAppUpdate()
    expect(mockLocalConfig.general.openPageFocusElement).toBe('keyboardBookmark')
  })

  it('migrates keyboard data from localStorage to keyboardBookmark', () => {
    localStorageMock['c-keyboard'] = JSON.stringify({
      keymap: { KeyA: { url: 'https://test.com' } },
      source: 1,
      fontSize: 16,
      fontFamily: 'Roboto',
    })
    handleAppUpdate()
    expect(mockLocalConfig.keyboardBookmark.keymap).toHaveProperty('KeyA')
    expect(mockLocalConfig.keyboardBookmark.source).toBe(1)
    expect(mockLocalConfig.keyboardCommon.fontSize).toBe(16)
    expect(mockLocalConfig.keyboardCommon.fontFamily).toBe('Roboto')
    // 旧 localStorage 条目应被清理
    expect(localStorageMock['c-keyboard']).toBeUndefined()
  })

  it('migrates commandShortcut data from localStorage to keyboardCommand', () => {
    localStorageMock['c-commandShortcut'] = JSON.stringify({
      enabled: true,
      modifierKeys: ['Control'],
    })
    handleAppUpdate()
    expect(mockLocalConfig.keyboardCommand.enabled).toBe(true)
    expect(mockLocalConfig.keyboardCommand.modifierKeys).toEqual(['Control'])
    expect(localStorageMock['c-commandShortcut']).toBeUndefined()
  })

  it('skips keyboard migration when localStorage has no c-keyboard', () => {
    const originalKeymap = { KeyB: { url: 'https://existing.com' } }
    mockLocalConfig.keyboardBookmark.keymap = originalKeymap
    handleAppUpdate()
    expect(mockLocalConfig.keyboardBookmark.keymap).toBe(originalKeymap)
  })

  it('migrates isFocusMode from general to localState', () => {
    ;(mockLocalConfig.general as any).isFocusMode = true
    handleAppUpdate()
    expect(mockLocalState.value.isFocusMode).toBe(true)
    expect((mockLocalConfig.general as any).isFocusMode).toBeUndefined()
  })

  it('skips isFocusMode migration when not present in general', () => {
    const before = mockLocalState.value.isFocusMode
    handleAppUpdate()
    expect(mockLocalState.value.isFocusMode).toBe(before)
  })
})

// ── 跨版本连续迁移：从老版本一路升到最新版本 ──

describe('handleAppUpdate: cumulative migration from old version', () => {
  it('applies all migrations when upgrading from v1.0.0', () => {
    mockLocalConfig.general.version = '1.0.0'
    mockLocalConfig.general.lang = 'en-US'
    mockLocalConfig.general.openPageFocusElement = 'bookmarkKeyboard'
    mockLocalConfig.general.focusVisibleWidgetMap = { stale: true }
    mockLocalConfig.clockDigital.fontSize = 30
    ;(mockLocalConfig.clockDigital as any).letterSpacing = 1
    mockLocalConfig.calendar.festivalCountdown = false
    mockLocalConfig.keyboardBookmark.keymap = { KeyX: { url: 'https://old.com' } }
    ;(mockLocalConfig.keyboardBookmark as any).isListenBackgroundKeystrokes = false
    mockLocalConfig.general.fontFamily = 'Arial'
    mockLocalConfig.calendar.dayFontFamily = 'Arial'
    mockLocalConfig.calendar.descFontFamily = 'Arial'
    ;(mockLocalConfig.general as any).isFocusMode = true

    handleAppUpdate()

    // v1.20.0
    expect(mockLocalConfig.keyboardBookmark.source).toBe(2)
    // v1.23.1
    expect(mockLocalConfig.clockDigital.width).toBe(30 / 2 + 8)
    expect((mockLocalConfig.clockDigital as any).letterSpacing).toBeUndefined()
    // v1.24.0
    expect(mockLocalConfig.general.timeLang).toBe('en-US')
    expect(mockLocalConfig.yearProgress.enabled).toBe(true)
    // v1.25.9
    expect(mockLocalConfig.calendar.festivalCountdown).toBe(true)
    // v1.27.0
    expect(mockLocalConfig.general.openPageFocusElement).toBe('keyboardBookmark')
    expect(mockLocalConfig.bookmarkFolder.enabled).toBe(false)
    // v2.0.0
    expect(mockLocalConfig.clockFlip.enabled).toBe(false)
    // v2.2.0
    expect(mockLocalConfig.keyboardBookmark.isGlobalShortcutEnabled).toBe(false)
    expect(mockLocalConfig.general.fontFamily).toBe('system')
    expect(mockLocalConfig.calendar.dayFontFamily).toBe('system')
    // v2.2.2
    expect(mockLocalConfig.general.focusVisibleWidgetMap).toEqual(
      { search: true, keyboardBookmark: true },
    )
    expect(mockLocalState.value.isFocusMode).toBe(true)
    expect((mockLocalConfig.general as any).isFocusMode).toBeUndefined()
  })

  it('updates version and shows changelog on breaking change', () => {
    mockLocalConfig.general.version = '1.0.0'
    handleAppUpdate()
    expect(mockLocalConfig.general.version).toBe('2.3.0')
    expect(mockGlobalState.isChangelogModalVisible).toBe(true)
  })

  it('shows changelog when migrating from old version (2.3.2 breaking change)', () => {
    mockLocalConfig.general.version = '2.2.5'
    mockLocalConfig.general.showBreakingChangeNotice = false
    handleAppUpdate()
    // 2.3.2 迁移将 showBreakingChangeNotice 设为 true（breaking change），
    // 因此最终 isChangelogModalVisible = true
    expect(mockGlobalState.isChangelogModalVisible).toBe(true)
  })
})

// ── 边界场景 ──

describe('handleAppUpdate: edge cases', () => {
  it('handles missing optional localStorage keys gracefully', () => {
    mockLocalConfig.general.version = '2.2.1'
    // localStorage 没有 c-keyboard 和 c-commandShortcut
    handleAppUpdate()
    // 不应报错，正常完成
    expect(mockLocalConfig.general.focusVisibleWidgetMap).toEqual(
      { search: true, keyboardBookmark: true },
    )
  })

  it('updates version even when no migration branches are triggered', () => {
    mockLocalConfig.general.version = '2.2.9'
    handleAppUpdate()
    expect(mockLocalConfig.general.version).toBe('2.3.0')
  })
})
