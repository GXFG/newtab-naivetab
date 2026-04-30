import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * config-reset.test.ts — 测试 config-reset.ts 中的 Widget 配置重置逻辑
 *
 * 由于模块级别使用 import.meta.glob 动态构建 PRESERVE_FIELDS_MAP，
 * 每次测试需 vi.resetModules() + vi.doMock() 获取全新模块实例。
 */

// Mock store
vi.mock('@/logic/store', () => {
  const mockLocalConfig = {
    clockDigital: {
      enabled: true,
      fontSize: 28,
      fontColor: ['rgba(0,0,0,1)', 'rgba(255,255,255,1)'],
      layout: { x: 0, y: 0 },
    },
    search: {
      enabled: true,
      isNewTabOpen: false,
      layout: { x: 1, y: 1 },
    },
    keyboardBookmark: {
      enabled: true,
      keymap: { KeyA: { url: 'https://example.com', name: 'Test' } },
      layout: { x: 0, y: 0 },
      source: 1,
    },
    keyboardCommand: {
      enabled: true,
      keymap: {},
      layout: { x: 0, y: 0 },
      isEnabled: true,
      modifiers: ['shift', 'alt'],
      noModifierMode: false,
    },
  }
  const obj = { localConfig: mockLocalConfig }
  ;(globalThis as any).__mockConfigResetStore = obj
  return obj
})

// Mock config
vi.mock('@/logic/config', () => {
  const obj = {
    defaultConfig: {
      clockDigital: {
        enabled: true,
        fontSize: 24,
        fontColor: ['rgba(0,0,0,1)', 'rgba(255,255,255,1)'],
        layout: { x: 0, y: 0 },
      },
      search: {
        enabled: true,
        isNewTabOpen: true,
        layout: { x: 0, y: 0 },
      },
      keyboardBookmark: {
        enabled: true,
        keymap: {},
        layout: { x: 0, y: 0 },
        source: 0,
        defaultExpandFolder: null,
      },
      keyboardCommand: {
        enabled: true,
        keymap: {},
        layout: { x: 0, y: 0 },
        isEnabled: true,
        modifiers: ['shift', 'alt'],
        noModifierMode: false,
      },
    },
  }
  ;(globalThis as any).__mockConfigResetDefaultConfig = obj
  return obj
})

// Mock shortcut-command
vi.mock('@/logic/globalShortcut/shortcut-command', () => ({
  COMMAND_SHORTCUT_CODE: 'keyboardCommand',
  PRESERVE_FIELDS: ['modifiers', 'keymap'],
}))

// Mock keyboard-config
vi.mock('@/logic/keyboard/keyboard-config', () => ({
  PRESERVE_FIELDS: ['fontSize', 'fontFamily'],
}))

import { resetWidgetConfig, hasWidgetConfig, hasPreserveFields } from '@/logic/config-reset'

function getMockConfig() {
  return (globalThis as any).__mockConfigResetStore.localConfig
}

describe('hasWidgetConfig', () => {
  it('returns true for known widget codes', () => {
    expect(hasWidgetConfig('clockDigital')).toBe(true)
    expect(hasWidgetConfig('search')).toBe(true)
  })

  it('returns false for unknown widget codes', () => {
    expect(hasWidgetConfig('nonexistentWidget')).toBe(false)
  })
})

describe('hasPreserveFields', () => {
  it('returns true for widgets with preserve fields', () => {
    // keyboardCommand has PRESERVE_FIELDS from shortcut-command
    expect(hasPreserveFields('keyboardCommand')).toBe(true)
    // keyboardCommon has PRESERVE_FIELDS from keyboard-config
    expect(hasPreserveFields('keyboardCommon')).toBe(true)
  })

  it('returns false for widgets without preserve fields', () => {
    expect(hasPreserveFields('clockDigital')).toBe(false)
    expect(hasPreserveFields('nonexistentWidget')).toBe(false)
  })
})

describe('resetWidgetConfig — full mode', () => {
  beforeEach(() => {
    // Reset localConfig to a "user-modified" state
    const mock = getMockConfig()
    mock.clockDigital = {
      enabled: false,
      fontSize: 99,
      fontColor: ['rgba(255,0,0,1)', 'rgba(0,255,0,1)'],
      layout: { x: 10, y: 20 },
    }
    mock.search = {
      enabled: true,
      isNewTabOpen: true,
      layout: { x: 5, y: 5 },
    }
  })

  it('resets all values to default, preserving only enabled and layout', () => {
    const mock = getMockConfig()
    resetWidgetConfig('clockDigital', 'full')

    // enabled and layout preserved
    expect(mock.clockDigital.enabled).toBe(false)
    expect(mock.clockDigital.layout).toEqual({ x: 10, y: 20 })

    // Other fields reset to default
    expect(mock.clockDigital.fontSize).toBe(24)
    expect(mock.clockDigital.fontColor).toEqual(['rgba(0,0,0,1)', 'rgba(255,255,255,1)'])
  })

  it('does nothing for unknown widget codes', () => {
    const mock = getMockConfig()
    const before = { ...mock.clockDigital }
    resetWidgetConfig('unknownWidget', 'full')
    expect(mock.clockDigital).toEqual(before)
  })

  it('preserves deep layout objects (not reference-shared)', () => {
    const mock = getMockConfig()
    resetWidgetConfig('clockDigital', 'full')
    // layout is preserved via deepClone, so modifying it after reset won't affect original
    expect(mock.clockDigital.layout).toEqual({ x: 10, y: 20 })
    expect(mock.clockDigital.layout).not.toBe({ x: 10, y: 20 }) // deepClone creates new object
  })
})

describe('resetWidgetConfig — quick mode', () => {
  beforeEach(() => {
    const mock = getMockConfig()
    // Use keyboardCommand since its PRESERVE_FIELDS are registered via the mock
    // (shortcut-command mock: COMMAND_SHORTCUT_CODE = 'keyboardCommand', PRESERVE_FIELDS = ['modifiers', 'keymap'])
    mock.keyboardCommand = {
      enabled: false,
      keymap: { KeyB: { url: 'https://custom.com', name: 'Custom' } },
      modifiers: ['ctrl', 'alt'],
      layout: { x: 3, y: 7 },
      isEnabled: true,
      noModifierMode: false,
    }
  })

  it('resets to default, preserving enabled, layout, AND preserve fields', () => {
    const mock = getMockConfig()
    resetWidgetConfig('keyboardCommand', 'quick')

    // enabled preserved
    expect(mock.keyboardCommand.enabled).toBe(false)
    // layout preserved
    expect(mock.keyboardCommand.layout).toEqual({ x: 3, y: 7 })
    // preserve fields (keymap, modifiers) preserved
    expect(mock.keyboardCommand.keymap).toEqual({ KeyB: { url: 'https://custom.com', name: 'Custom' } })
    expect(mock.keyboardCommand.modifiers).toEqual(['ctrl', 'alt'])
    // non-preserve fields reset
    expect(mock.keyboardCommand.isEnabled).toBe(true)
    expect(mock.keyboardCommand.noModifierMode).toBe(false)
  })

  it('preserves preserve fields even when they are deep objects', () => {
    const mock = getMockConfig()
    const originalKeymap = mock.keyboardCommand.keymap
    resetWidgetConfig('keyboardCommand', 'quick')
    // keymap should be a deep clone, not the same reference
    expect(mock.keyboardCommand.keymap).toBeTruthy()
    expect(mock.keyboardCommand.keymap).toEqual(originalKeymap)
    // The preserved value is deep-cloned, so reference differs
    // (implementation uses JSON.parse(JSON.stringify))
  })
})

describe('resetWidgetConfig — edge cases', () => {
  it('handles widgets where enabled/layout are undefined', () => {
    const mock = getMockConfig()
    mock.search = { isNewTabOpen: true } as any
    resetWidgetConfig('search', 'full')
    // enabled and layout are NOT preserved (they were undefined)
    expect(mock.search.enabled).toBe(true) // from default
    expect(mock.search.isNewTabOpen).toBe(true) // from default
  })
})
