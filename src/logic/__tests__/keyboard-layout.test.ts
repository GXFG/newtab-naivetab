import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * keyboard-layout.test.ts — 测试 keyboard-layout.ts 的布局计算逻辑
 *
 * currKeyboardConfig 是一个 computed，根据配置动态生成键盘布局。
 * 通过 mock store 和依赖，测试 WKL 模式、macOS 交换、Space 变体等分支。
 */

const defaultKeyLayout = [
  { code: 'Escape', x: 0, y: 0, w: 1, h: 1 },
  { code: 'Digit1', x: 1, y: 0, w: 1, h: 1 },
  { code: 'Space', x: 6, y: 4, w: 6, h: 1 },
  { code: 'MetaLeft', x: 0, y: 4, w: 1.25, h: 1 },
  { code: 'AltLeft', x: 1.25, y: 4, w: 1.25, h: 1 },
  { code: 'MetaRight', x: 10.25, y: 4, w: 1.25, h: 1 },
  { code: 'AltRight', x: 11.5, y: 4, w: 1.25, h: 1 },
]

function setupMocks(overrides?: {
  isMacOS?: boolean
  keyboardType?: string
  keyboardWklMode?: boolean
  splitSpace?: string
}) {
  const isMacOS = overrides?.isMacOS ?? false
  const keyboardType = overrides?.keyboardType ?? 'key61'
  const keyboardWklMode = overrides?.keyboardWklMode ?? false
  const splitSpace = overrides?.splitSpace ?? 'space1'

  vi.doMock('@/env', () => ({ isMacOS }))
  vi.doMock('@/logic/config/state', () => ({
    localConfig: {
      keyboardCommon: { keyboardType, keyboardWklMode, splitSpace },
    },
  }))
  vi.doMock('@/logic/keyboard/keyboard-constants', () => ({
    EMPHASIS_ONE_KEYS: ['Escape', 'Enter'],
    EMPHASIS_TWO_KEYS: ['Space'],
    DEFAULT_LAYER_SOURCE_FOLDER: 'NaiveTab',
  }))
  vi.doMock('@/logic/keyboard/layouts', () => {
    const layoutsObj: Record<string, any> = {
      key61: {
        name: '61%',
        keys: [...defaultKeyLayout],
        spaceVariants: {
          space2: [{ code: 'SpaceSplit1', w: 3 }, { code: 'SpaceSplit2', w: 3 }],
        },
      },
      key87: {
        name: '87%',
        keys: [...defaultKeyLayout, { code: 'F1', x: 13, y: 0, w: 1, h: 1 }],
        spaceVariants: null,
      },
      // Fallback for tests that use non-existent preset
      nonexistent: undefined,
    }
    return layoutsObj
  })
}

describe('currKeyboardConfig', () => {
  let currKeyboardConfig: typeof import('@/logic/keyboard/keyboard-layout')['currKeyboardConfig']

  beforeEach(() => {
    vi.resetModules()
  })

  it('returns default preset when type matches', async () => {
    setupMocks()
    const mod = await import('@/logic/keyboard/keyboard-layout')
    currKeyboardConfig = mod.currKeyboardConfig
    expect(currKeyboardConfig.value.name).toBe('61%')
    expect(currKeyboardConfig.value.keys.length).toBeGreaterThan(0)
  })

  it('falls back to key61 when preset not found', async () => {
    setupMocks({ keyboardType: 'nonexistent' })
    const mod = await import('@/logic/keyboard/keyboard-layout')
    currKeyboardConfig = mod.currKeyboardConfig
    expect(currKeyboardConfig.value.name).toBe('61%')
  })

  it('injects emphasis codes', async () => {
    setupMocks()
    const mod = await import('@/logic/keyboard/keyboard-layout')
    currKeyboardConfig = mod.currKeyboardConfig
    expect(currKeyboardConfig.value.emphasisOneCodes).toEqual(['Escape', 'Enter'])
    expect(currKeyboardConfig.value.emphasisTwoCodes).toEqual(['Space'])
  })

  it('removes Win keys in WKL mode', async () => {
    setupMocks({ keyboardWklMode: true })
    const mod = await import('@/logic/keyboard/keyboard-layout')
    currKeyboardConfig = mod.currKeyboardConfig
    const config = currKeyboardConfig.value
    const lastRowY = Math.max(...config.keys.map((k) => k.y))
    const lastRowMetaKeys = config.keys.filter(
      (k) => k.y === lastRowY && ['MetaLeft', 'MetaRight'].includes(k.code),
    )
    expect(lastRowMetaKeys).toHaveLength(0)
  })

  it('does not remove Win keys when WKL mode is off', async () => {
    setupMocks()
    const mod = await import('@/logic/keyboard/keyboard-layout')
    currKeyboardConfig = mod.currKeyboardConfig
    const codes = currKeyboardConfig.value.keys.map((k) => k.code)
    expect(codes).toContain('MetaLeft')
    expect(codes).toContain('MetaRight')
  })

  it('swaps Meta and Alt on macOS when not in WKL mode', async () => {
    setupMocks({ isMacOS: true })
    const mod = await import('@/logic/keyboard/keyboard-layout')
    currKeyboardConfig = mod.currKeyboardConfig
    const config = currKeyboardConfig.value
    const lastRowY = Math.max(...config.keys.map((k) => k.y))
    const lastRowKeys = config.keys.filter((k) => k.y === lastRowY)
    const metaLeft = lastRowKeys.find((k) => k.code === 'MetaLeft')
    const altLeft = lastRowKeys.find((k) => k.code === 'AltLeft')

    expect(metaLeft?.x).toBe(1.25)
    expect(altLeft?.x).toBe(0)
  })

  it('splits Space key when splitSpace is not space1', async () => {
    setupMocks({ splitSpace: 'space2' })
    const mod = await import('@/logic/keyboard/keyboard-layout')
    currKeyboardConfig = mod.currKeyboardConfig
    const config = currKeyboardConfig.value
    const lastRowY = Math.max(...config.keys.map((k) => k.y))
    const spaceKeys = config.keys.filter(
      (k) => k.y === lastRowY && ['SpaceSplit1', 'SpaceSplit2'].includes(k.code),
    )
    expect(spaceKeys).toHaveLength(2)
    const originalSpace = config.keys.find(
      (k) => k.code === 'Space' && k.y === lastRowY,
    )
    expect(originalSpace).toBeUndefined()
  })

  it('keeps Space as-is when splitSpace is space1', async () => {
    setupMocks()
    const mod = await import('@/logic/keyboard/keyboard-layout')
    currKeyboardConfig = mod.currKeyboardConfig
    const config = currKeyboardConfig.value
    const lastRowY = Math.max(...config.keys.map((k) => k.y))
    const spaceKey = config.keys.find(
      (k) => k.code === 'Space' && k.y === lastRowY,
    )
    expect(spaceKey).toBeDefined()
  })
})

describe('keyboardCurrentModelAllKeyList', () => {
  let keyboardCurrentModelAllKeyList: typeof import('@/logic/keyboard/keyboard-layout')['keyboardCurrentModelAllKeyList']

  beforeEach(async () => {
    vi.resetModules()
    setupMocks()
    const mod = await import('@/logic/keyboard/keyboard-layout')
    keyboardCurrentModelAllKeyList = mod.keyboardCurrentModelAllKeyList
  })

  it('returns list of all key codes', () => {
    const codes = keyboardCurrentModelAllKeyList.value
    expect(codes).toContain('Escape')
    expect(codes).toContain('Space')
    expect(codes).toContain('Digit1')
  })
})
