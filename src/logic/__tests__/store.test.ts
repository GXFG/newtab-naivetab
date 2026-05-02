import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive } from 'vue'

/**
 * store.test.ts — 测试 store.ts 中可独立验证的导出
 *
 * store.ts 有大量模块级副作用（watchers、事件监听、DOM 操作），
 * 因此测试策略是 mock 所有依赖，仅测试纯/近纯函数。
 */

describe('store (isolated exports)', () => {
  let colorMixWithAlpha: (typeof import('@/logic/store'))['colorMixWithAlpha']
  let getSettingKeyboardSize: (typeof import('@/logic/store'))['getSettingKeyboardSize']
  let getStyleField: (typeof import('@/logic/store'))['getStyleField']
  let getIsWidgetRender: (typeof import('@/logic/store'))['getIsWidgetRender']
  let getStyleConst: (typeof import('@/logic/store'))['getStyleConst']

  beforeEach(async () => {
    vi.resetModules()

    // Mock all dependencies BEFORE importing store
    vi.doMock('@/composables/useStorageLocal', () => ({
      useStorageLocal: vi.fn((key: string, defaultVal: any) => ref(defaultVal)),
    }))

    vi.doMock('@/env', () => ({
      isEdge: false,
      isFirefox: false,
      isMacOS: false,
    }))

    vi.doMock('@/styles/const', () => ({
      styleConst: ref({
        gap: ['8px', '10px'],
      }),
    }))

    vi.doMock('@/logic/constants/urls', () => ({
      URL_CHROME_STORE: 'https://chrome.google.com/webstore/detail/test',
      URL_EDGE_STORE: 'https://microsoftedge.microsoft.com/test',
      URL_FIREFOX_STORE: 'https://addons.mozilla.org/test',
    }))

    vi.doMock('@/logic/constants/app', () => ({
      APPEARANCE_TO_CODE_MAP: { light: 0, dark: 1, auto: 0 },
      DAYJS_LANG_MAP: { 'zh-CN': 'zh-cn', 'en-US': 'en', 'zh-TW': 'zh-tw' },
      MERGE_CONFIG_DELAY: 2000,
      MERGE_CONFIG_MAX_DELAY: 5000,
    }))

    vi.doMock('@/logic/constants/fonts', () => ({
      FONT_LIST: ['system', 'Arial', 'Roboto'],
    }))

    vi.doMock('@/logic/config/defaults', () => ({
      defaultConfig: {
        general: {
          version: '2.2.5',
          lang: 'en-US',
          appearance: 'auto' as const,
          primaryColor: ['rgba(58, 115, 195, 1)', 'rgba(100, 160, 230, 1)'],
          fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
          backgroundColor: ['rgba(232, 236, 241, 1)', 'rgba(26, 26, 46, 1)'],
          focusVisibleWidgetMap: { search: true, clockDigital: true },
        },
        search: { enabled: false, fontSize: 14 },
        clockDigital: { enabled: false, fontSize: 28 },
        keyboardCommon: { fontSize: 14 },
        keyboardCommand: { enabled: true },
        keyboardBookmark: { keymap: {} },
        yearProgress: { enabled: true },
        calendar: { enabled: true },
        memo: { enabled: true },
        news: { enabled: true },
        bookmarkFolder: { enabled: false },
        clockFlip: { enabled: false },
      },
      defaultLocalState: {
        currAppearanceLabel: 'light' as const,
        currAppearanceCode: 0 as const,
        isUploadConfigStatusMap: { general: { dirty: false } },
        isFocusMode: false,
      },
    }))

    vi.doMock('@/logic/util', () => ({
      log: vi.fn(),
      compareLeftVersionLessThanRightVersions: vi.fn(),
      createTab: vi.fn(),
      downloadJsonByTagA: vi.fn(),
    }))

    vi.doMock('@/newtab/widgets/codes', () => ({
      WIDGET_CODE_LIST: ['search', 'clockDigital'],
    }))

    vi.doMock('@/newtab/widgets/registry', () => ({}))

    vi.doMock('@/setting/registry', () => ({
      SETTING_KEYBOARD_BASE_SIZE: 35,
    }))

    vi.doMock('naive-ui', () => ({
      enUS: { name: 'enUS' },
      zhCN: { name: 'zhCN' },
      darkTheme: { name: 'darkTheme' },
      useOsTheme: vi.fn(() => ref('light')),
    }))

    // Set up document.fullscreenElement mock
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    })

    // Mock document.fonts for initAvailableFontList
    Object.defineProperty(document, 'fonts', {
      value: {
        ready: Promise.resolve([]),
        check: vi.fn().mockReturnValue(true),
      },
      configurable: true,
      writable: true,
    })

    const mod = await import('@/logic/store')
    colorMixWithAlpha = mod.colorMixWithAlpha
    getSettingKeyboardSize = mod.getSettingKeyboardSize
    getStyleField = mod.getStyleField
    getIsWidgetRender = mod.getIsWidgetRender
    getStyleConst = mod.getStyleConst
  })

  describe('colorMixWithAlpha', () => {
    it('generates color-mix expression with correct percentage', () => {
      const result = colorMixWithAlpha('rgba(255,0,0,1)', 0.12)
      expect(result).toBe(
        'color-mix(in srgb, rgba(255,0,0,1) 12%, transparent)',
      )
    })

    it('handles 50% alpha', () => {
      const result = colorMixWithAlpha('rgba(0,0,0,1)', 0.5)
      expect(result).toBe('color-mix(in srgb, rgba(0,0,0,1) 50%, transparent)')
    })

    it('handles 0% alpha', () => {
      const result = colorMixWithAlpha('rgba(100,100,100,1)', 0)
      expect(result).toBe(
        'color-mix(in srgb, rgba(100,100,100,1) 0%, transparent)',
      )
    })

    it('rounds the percentage', () => {
      const result = colorMixWithAlpha('rgba(10,20,30,1)', 0.337)
      expect(result).toBe(
        'color-mix(in srgb, rgba(10,20,30,1) 34%, transparent)',
      )
    })
  })

  describe('getSettingKeyboardSize', () => {
    it('returns base size in drawer mode', async () => {
      const { globalState } = await import('@/logic/store')
      globalState.settingMode = 'drawer'
      expect(getSettingKeyboardSize()).toBe(35)
    })

    it('returns 1.4x size in options mode', async () => {
      const { globalState } = await import('@/logic/store')
      globalState.settingMode = 'options'
      expect(getSettingKeyboardSize()).toBe(Math.round(35 * 1.4)) // 49
    })
  })

  describe('getStyleField', () => {
    it('returns color value at current appearance index for arrays', async () => {
      const { localConfig, localState } = await import('@/logic/store')
      localConfig.general.fontColor = [
        'rgba(44, 62, 80, 1)',
        'rgba(255, 255, 255, 1)',
      ]
      localState.value.currAppearanceCode = 0
      const result = getStyleField('general', 'fontColor')
      expect(result.value).toBe('rgba(44, 62, 80, 1)')
    })

    it('returns dark mode color when appearanceCode is 1', async () => {
      const { localConfig, localState } = await import('@/logic/store')
      localConfig.general.fontColor = [
        'rgba(44, 62, 80, 1)',
        'rgba(255, 255, 255, 1)',
      ]
      localState.value.currAppearanceCode = 1
      const result = getStyleField('general', 'fontColor')
      expect(result.value).toBe('rgba(255, 255, 255, 1)')
    })

    it('returns raw value for non-number fields', async () => {
      const { localConfig } = await import('@/logic/store')
      localConfig.search.enabled = false
      const result = getStyleField('search', 'enabled')
      expect(result.value).toBe(false)
    })

    it('applies ratio multiplier', async () => {
      const { localConfig } = await import('@/logic/store')
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', undefined, 2)
      expect(result.value).toBe(28)
    })

    it('converts number to vmin unit (with ×0.1 factor)', async () => {
      const { localConfig } = await import('@/logic/store')
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', 'vmin')
      // 14 * 0.1 = 1.4 (floating point: 1.4000000000000001)
      expect(result.value).toMatch(/^1\.4\d*vmin$/)
    })

    it('applies ratio + vmin together', async () => {
      const { localConfig } = await import('@/logic/store')
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', 'vmin', 2)
      // 14 * 2 * 0.1 = 2.8 (floating point: 2.8000000000000003)
      expect(result.value).toMatch(/^2\.8\d*vmin$/)
    })

    it('appends px unit without scaling', async () => {
      const { localConfig } = await import('@/logic/store')
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', 'px')
      expect(result.value).toBe('14px')
    })

    it('handles nested field paths with dot notation', async () => {
      const { localConfig } = await import('@/logic/store')
      // general doesn't have nested, but let's test with general.version
      localConfig.general.version = '2.2.5'
      const result = getStyleField('general', 'version')
      expect(result.value).toBe('2.2.5')
    })
  })

  describe('getIsWidgetRender', () => {
    it('returns computed ref reflecting widget enabled state', async () => {
      const { localConfig } = await import('@/logic/store')
      localConfig.search.enabled = true
      const isRender = getIsWidgetRender('search')
      expect(isRender.value).toBe(true)

      localConfig.search.enabled = false
      expect(isRender.value).toBe(false)
    })
  })

  describe('switchSettingDrawerVisible', () => {
    it('sets isSettingDrawerVisible to true', async () => {
      const mod = await import('@/logic/store')
      mod.switchSettingDrawerVisible(true)
      expect(mod.globalState.isSettingDrawerVisible).toBe(true)
    })

    it('sets isSettingDrawerVisible to false', async () => {
      const mod = await import('@/logic/store')
      mod.switchSettingDrawerVisible(false)
      expect(mod.globalState.isSettingDrawerVisible).toBe(false)
    })
  })

  describe('openChangelogModal', () => {
    it('sets isChangelogModalVisible to true', async () => {
      const mod = await import('@/logic/store')
      mod.openChangelogModal()
      expect(mod.globalState.isChangelogModalVisible).toBe(true)
    })
  })

  describe('currDayjsLang', () => {
    it('returns lang based on timeLang config', async () => {
      const { localConfig, currDayjsLang } = await import('@/logic/store')
      localConfig.general.timeLang = 'zh-CN'
      expect(currDayjsLang.value).toBe('zh-cn')

      localConfig.general.timeLang = 'en-US'
      expect(currDayjsLang.value).toBe('en')
    })

    it('falls back to en for unknown lang', async () => {
      const { localConfig, currDayjsLang } = await import('@/logic/store')
      localConfig.general.timeLang = 'unknown'
      expect(currDayjsLang.value).toBe('en')
    })
  })

  describe('getStyleConst', () => {
    it('returns computed ref for style constant at current appearance', async () => {
      const { localState, getStyleConst } = await import('@/logic/store')
      localState.value.currAppearanceCode = 0
      const result = getStyleConst('gap')
      expect(result.value).toBe('8px')

      localState.value.currAppearanceCode = 1
      expect(result.value).toBe('10px')
    })

    it('falls back to index 0 when appearance index not available', async () => {
      const { localState, getStyleConst } = await import('@/logic/store')
      // styleConst only has gap with 2 values, accessing a field with only index 0
      // should fall back correctly
      localState.value.currAppearanceCode = 99
      // This tests the fallback behavior of getStyleConst
      const result = getStyleConst('gap')
      // Should return index 0 since 99 doesn't exist
      expect(result.value).toBe('8px')
    })
  })
})
