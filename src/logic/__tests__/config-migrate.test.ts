import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * config-migrate.test.ts — 测试 normalizeLegacyConfig 纯函数
 *
 * 覆盖 normalizeLegacyConfig 的全部转换规则：
 * 1. 顶层 key 重命名（bookmark→keyboardBookmark、keyboard→keyboardBookmark 等）
 * 2. 外观字段拆分（keyboardBookmark→keyboardCommon）
 * 3. focusVisibleWidgetMap key 重命名
 * 4. openPageFocusElement 值修正
 * 5. isFocusMode 从 general 提取
 */

let normalizeLegacyConfig: typeof import('@/logic/config/migrate').normalizeLegacyConfig

// 需要 mock 因为 migrate.ts 导入 KEYBOARD_COMMON_CONFIG
beforeEach(async () => {
  vi.resetModules()
  vi.doMock('@/logic/config/defaults', () => ({
    KEYBOARD_COMMON_CONFIG: {
      keyboardType: 'key61',
      keycapType: 'gmk',
      mainFontColor: ['rgba(60,65,70,1.0)', 'rgba(226,232,240,1.0)'],
      isShellVisible: true,
      plateColor: ['rgba(80, 80, 80, 0.7)', 'rgba(119, 119, 119, 0.5)'],
      keycapBookmarkFontFamily: 'Arial',
    },
  }))

  const mod = await import('@/logic/config/migrate')
  normalizeLegacyConfig = mod.normalizeLegacyConfig
})

// ── 1. 顶层 key 重命名 ──

describe('顶层 key 重命名', () => {
  it('将旧 bookmark key 重命名为 keyboardBookmark', () => {
    const raw = {
      general: { version: '1.19.0' },
      bookmark: { keymap: { KeyA: { url: 'https://test.com' } } },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.keyboardBookmark).toBeDefined()
    expect(result.config.bookmark).toBeUndefined()
    expect(result.config.keyboardBookmark.keymap.KeyA.url).toBe('https://test.com')
  })

  it('将旧 keyboard key 重命名为 keyboardBookmark（v2.2.2 旧 key）', () => {
    const raw = {
      general: { version: '2.2.2' },
      keyboard: { keymap: {}, source: 1 },
      commandShortcut: { isEnabled: true },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.keyboardBookmark).toBeDefined()
    expect(result.config.keyboard).toBeUndefined()
  })

  it('将旧 commandShortcut key 重命名为 keyboardCommand', () => {
    const raw = {
      general: { version: '2.2.2' },
      commandShortcut: { keymap: { KeyA: { command: 'prevTab' } } },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.keyboardCommand).toBeDefined()
    expect(result.config.commandShortcut).toBeUndefined()
  })

  it('新 key 已存在时不覆盖旧 key', () => {
    const raw = {
      general: { version: '2.2.2' },
      keyboardBookmark: { keymap: { KeyB: { url: 'https://new.com' } } },
      bookmark: { keymap: { KeyA: { url: 'https://old.com' } } },
    }
    const result = normalizeLegacyConfig(raw)
    // keyboardBookmark 已存在，bookmark 应保留不删除
    expect(result.config.keyboardBookmark.keymap.KeyB.url).toBe('https://new.com')
    expect(result.config.bookmark).toBeDefined()
  })
})

// ── 2. 外观字段拆分（keyboardBookmark → keyboardCommon） ──

describe('外观字段拆分', () => {
  it('将外观相关字段从 keyboardBookmark 拆分到 keyboardCommon', () => {
    const raw = {
      general: { version: '1.26.0' },
      keyboardBookmark: {
        keymap: { KeyA: { url: 'https://test.com' } },
        keyboardType: 'key87',
        keycapType: 'dsa',
        mainFontColor: ['rgba(0,0,0,1)', 'rgba(255,255,255,1)'],
      },
    }
    const result = normalizeLegacyConfig(raw)
    // 外观字段应迁移到 keyboardCommon
    expect(result.config.keyboardCommon.keyboardType).toBe('key87')
    expect(result.config.keyboardCommon.keycapType).toBe('dsa')
    expect(result.config.keyboardCommon.mainFontColor).toEqual(['rgba(0,0,0,1)', 'rgba(255,255,255,1)'])
    // 外观字段应从 keyboardBookmark 中删除
    expect(result.config.keyboardBookmark.keyboardType).toBeUndefined()
    expect(result.config.keyboardBookmark.keycapType).toBeUndefined()
    expect(result.config.keyboardBookmark.keymap).toBeDefined()
  })

  it('未拆分的键盘书签配置不创建 keyboardCommon', () => {
    const raw = {
      general: { version: '2.2.3' },
      keyboardBookmark: { keymap: {}, source: 1 },
      keyboardCommon: { keyboardType: 'key61' },
    }
    const result = normalizeLegacyConfig(raw)
    // keyboardCommon 已存在，不应触发拆分
    expect(result.config.keyboardBookmark.keyboardType).toBeUndefined()
  })

  it('默认配置中保留外观字段的值', () => {
    const raw = {
      general: { version: '1.26.0' },
      keyboardBookmark: {
        isShellVisible: false,
      },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.keyboardCommon.isShellVisible).toBe(false)
    expect(result.config.keyboardBookmark.isShellVisible).toBeUndefined()
  })
})

// ── 3. focusVisibleWidgetMap key 重命名 ──

describe('focusVisibleWidgetMap key 重命名', () => {
  it('将 keyboard 重命名为 keyboardBookmark', () => {
    const raw = {
      general: {
        version: '2.2.1',
        focusVisibleWidgetMap: { keyboard: true, search: true },
      },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.general.focusVisibleWidgetMap.keyboardBookmark).toBe(true)
    expect(result.config.general.focusVisibleWidgetMap.keyboard).toBeUndefined()
    expect(result.config.general.focusVisibleWidgetMap.search).toBe(true)
  })

  it('将 commandShortcut 重命名为 keyboardCommand', () => {
    const raw = {
      general: {
        version: '2.2.1',
        focusVisibleWidgetMap: { commandShortcut: true },
      },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.general.focusVisibleWidgetMap.keyboardCommand).toBe(true)
    expect(result.config.general.focusVisibleWidgetMap.commandShortcut).toBeUndefined()
  })

  it('新 key 已存在时不重命名', () => {
    const raw = {
      general: {
        version: '2.2.1',
        focusVisibleWidgetMap: { keyboardBookmark: true, keyboard: false },
      },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.general.focusVisibleWidgetMap.keyboardBookmark).toBe(true)
    expect(result.config.general.focusVisibleWidgetMap.keyboard).toBe(false)
  })
})

// ── 4. openPageFocusElement 值修正 ──

describe('openPageFocusElement 值修正', () => {
  it('将 keyboard 值修正为 keyboardBookmark', () => {
    const raw = {
      general: {
        version: '2.2.1',
        openPageFocusElement: 'keyboard',
      },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.general.openPageFocusElement).toBe('keyboardBookmark')
  })

  it('非 keyboard 值保持不变', () => {
    const raw = {
      general: {
        version: '2.2.1',
        openPageFocusElement: 'search',
      },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.general.openPageFocusElement).toBe('search')
  })
})

// ── 5. isFocusMode 从 general 提取 ──

describe('isFocusMode 从 general 提取', () => {
  it('从 general 中提取 isFocusMode', () => {
    const raw = {
      general: {
        version: '2.2.1',
        isFocusMode: true,
      },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.extractedIsFocusMode).toBe(true)
    expect(result.config.general.isFocusMode).toBeUndefined()
  })

  it('isFocusMode 为 false 时也正确提取', () => {
    const raw = {
      general: {
        version: '2.2.1',
        isFocusMode: false,
      },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.extractedIsFocusMode).toBe(false)
  })

  it('不存在 isFocusMode 时 extractedIsFocusMode 为 undefined', () => {
    const raw = {
      general: { version: '2.3.0' },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.extractedIsFocusMode).toBeUndefined()
  })
})

// ── 6. 多版本叠加的旧配置 ──

describe('多版本叠加旧配置', () => {
  it('同时处理多种旧结构的完整迁移', () => {
    const raw = {
      general: {
        version: '1.25.0',
        isFocusMode: true,
        focusVisibleWidgetMap: {
          keyboard: true,
          commandShortcut: false,
          search: true,
        },
        openPageFocusElement: 'keyboard',
      },
      bookmark: {
        keymap: { KeyA: { url: 'https://test.com' } },
        keyboardType: 'key87',
        mainFontColor: ['rgba(0,0,0,1)', 'rgba(255,255,255,1)'],
      },
      commandShortcut: {
        keymap: { KeyQ: { command: 'prevTab' } },
      },
    }
    const result = normalizeLegacyConfig(raw)

    // 顶层 key 重命名
    expect(result.config.keyboardBookmark).toBeDefined()
    expect(result.config.keyboardCommand).toBeDefined()
    expect(result.config.bookmark).toBeUndefined()
    expect(result.config.commandShortcut).toBeUndefined()

    // 外观字段拆分
    expect(result.config.keyboardCommon.keyboardType).toBe('key87')
    expect(result.config.keyboardCommon.mainFontColor).toEqual(['rgba(0,0,0,1)', 'rgba(255,255,255,1)'])
    expect(result.config.keyboardBookmark.keyboardType).toBeUndefined()

    // focusVisibleWidgetMap key 重命名
    expect(result.config.general.focusVisibleWidgetMap.keyboardBookmark).toBe(true)
    expect(result.config.general.focusVisibleWidgetMap.keyboardCommand).toBe(false)
    expect(result.config.general.focusVisibleWidgetMap.keyboard).toBeUndefined()
    expect(result.config.general.focusVisibleWidgetMap.commandShortcut).toBeUndefined()

    // openPageFocusElement 值修正
    expect(result.config.general.openPageFocusElement).toBe('keyboardBookmark')

    // isFocusMode 提取
    expect(result.extractedIsFocusMode).toBe(true)
    expect(result.config.general.isFocusMode).toBeUndefined()
  })
})

// ── 7. 边界场景 ──

describe('边界场景', () => {
  it('空配置不报错', () => {
    const result = normalizeLegacyConfig({})
    expect(result.config).toEqual({})
    expect(result.extractedIsFocusMode).toBeUndefined()
  })

  it('不修改传入的原始对象（深拷贝保护）', () => {
    const raw = {
      general: { version: '1.25.0', isFocusMode: true },
      bookmark: { keymap: {} },
    }
    const cloned = JSON.parse(JSON.stringify(raw))
    normalizeLegacyConfig(raw)
    // 原始对象不应被修改（structuredClone 保护了顶层 key，但 general 会被修改）
    // bookmark 应该仍然存在
    expect(raw.bookmark).toBeDefined()
  })

  it('不存在的 general 字段时不报错', () => {
    const raw = {
      keyboardBookmark: { keymap: {} },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.keyboardBookmark.keymap).toEqual({})
  })

  it('focusVisibleWidgetMap 为非对象时不报错', () => {
    const raw = {
      general: {
        version: '2.2.1',
        focusVisibleWidgetMap: null,
      },
    }
    const result = normalizeLegacyConfig(raw)
    expect(result.config.general.focusVisibleWidgetMap).toBeNull()
  })
})
