import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive } from 'vue'

/**
 * store.test.ts — 测试 store.ts 中可独立验证的导出
 *
 * store.ts 有大量模块级副作用（watchers、事件监听、DOM 操作），
 * 因此测试策略是 mock 所有依赖，仅测试纯/近纯函数。
 */

describe('store (isolated exports)', () => {
  let colorMixWithAlpha: (typeof import('@/logic/store/style'))['colorMixWithAlpha']
  let getSettingKeyboardSize: (typeof import('@/logic/store/style'))['getSettingKeyboardSize']
  let getStyleField: (typeof import('@/logic/store/style'))['getStyleField']
  let getIsWidgetRender: (typeof import('@/logic/store/style'))['getIsWidgetRender']

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
        widgetInteractionOrder: [],
      },
    }))

    vi.doMock('@/logic/utils/util', () => ({
      log: vi.fn(),
      compareLeftVersionLessThanRightVersions: vi.fn(),
      createTab: vi.fn(),
    }))

    vi.doMock('@/common/widget-constants', () => ({
      WIDGET_CODE_LIST: ['search', 'clockDigital'],
    }))

    vi.doMock('@/common/keyboard', () => ({
      SETTING_KEYBOARD_BASE_SIZE: 35,
    }))

    // theme.ts 用原生 matchMedia 检测 OS 主题
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

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

    const mod = await import('@/logic/store/style')
    colorMixWithAlpha = mod.colorMixWithAlpha
    getSettingKeyboardSize = mod.getSettingKeyboardSize
    getStyleField = mod.getStyleField
    getIsWidgetRender = mod.getIsWidgetRender
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
      const { globalState } = await import('@/logic/store/state')
      globalState.settingMode = 'drawer'
      expect(getSettingKeyboardSize()).toBe(35)
    })

    it('returns 1.4x size in options mode', async () => {
      const { globalState } = await import('@/logic/store/state')
      globalState.settingMode = 'options'
      expect(getSettingKeyboardSize()).toBe(Math.round(35 * 1.4)) // 49
    })
  })

  describe('getStyleField', () => {
    it('returns color value at current appearance index for arrays', async () => {
      const { localConfig, localState } = await import('@/logic/config/state')
      localConfig.general.fontColor = [
        'rgba(44, 62, 80, 1)',
        'rgba(255, 255, 255, 1)',
      ]
      localState.value.currAppearanceCode = 0
      const result = getStyleField('general', 'fontColor')
      expect(result.value).toBe('rgba(44, 62, 80, 1)')
    })

    it('returns dark mode color when appearanceCode is 1', async () => {
      const { localConfig, localState } = await import('@/logic/config/state')
      localConfig.general.fontColor = [
        'rgba(44, 62, 80, 1)',
        'rgba(255, 255, 255, 1)',
      ]
      localState.value.currAppearanceCode = 1
      const result = getStyleField('general', 'fontColor')
      expect(result.value).toBe('rgba(255, 255, 255, 1)')
    })

    it('returns raw value for non-number fields', async () => {
      const { localConfig } = await import('@/logic/config/state')
      localConfig.search.enabled = false
      const result = getStyleField('search', 'enabled')
      expect(result.value).toBe(false)
    })

    it('applies ratio multiplier', async () => {
      const { localConfig } = await import('@/logic/config/state')
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', undefined, 2)
      expect(result.value).toBe(28)
    })

    it('converts vmin to damped calc() in auto mode', async () => {
      const { localConfig } = await import('@/logic/config/state')
      localConfig.general.scaleMode = 'auto'
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', 'vmin')
      // VMIN_DAMPING=0.5: base=14×0.1=1.4, vmin=1.4×0.5=0.70, px=1.4×10.8×0.5=7.56
      expect(result.value).toBe('calc(0.70vmin + 7.56px)')
    })

    it('applies ratio before damping in auto mode', async () => {
      const { localConfig } = await import('@/logic/config/state')
      localConfig.general.scaleMode = 'auto'
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', 'vmin', 2)
      // 14×2=28, base=28×0.1=2.8, vmin=2.8×0.5=1.40, px=2.8×10.8×0.5=15.12
      expect(result.value).toBe('calc(1.40vmin + 15.12px)')
    })

    it('converts vmin to px when scaleMode is fixed (skip ×0.1)', async () => {
      const { localConfig } = await import('@/logic/config/state')
      localConfig.general.scaleMode = 'fixed'
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', 'vmin')
      // fixed 模式：不乘 0.1，直接拼接 px
      expect(result.value).toBe('14px')
    })

    it('applies ratio in fixed mode (ratio applied, ×0.1 skipped)', async () => {
      const { localConfig } = await import('@/logic/config/state')
      localConfig.general.scaleMode = 'fixed'
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', 'vmin', 2)
      // 14 * 2 = 28px
      expect(result.value).toBe('28px')
    })

    it('px unit is unaffected by scaleMode', async () => {
      const { localConfig } = await import('@/logic/config/state')
      localConfig.general.scaleMode = 'fixed'
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', 'px')
      // px 单位不受 scaleMode 影响
      expect(result.value).toBe('14px')
    })

    it('appends px unit without scaling', async () => {
      const { localConfig } = await import('@/logic/config/state')
      localConfig.search.fontSize = 14
      const result = getStyleField('search', 'fontSize', 'px')
      expect(result.value).toBe('14px')
    })

    it('handles nested field paths with dot notation', async () => {
      const { localConfig } = await import('@/logic/config/state')
      // general doesn't have nested, but let's test with general.version
      localConfig.general.version = '2.2.5'
      const result = getStyleField('general', 'version')
      expect(result.value).toBe('2.2.5')
    })
  })

  describe('getIsWidgetRender', () => {
    it('returns computed ref reflecting widget enabled state', async () => {
      const { localConfig } = await import('@/logic/config/state')
      localConfig.search.enabled = true
      const isRender = getIsWidgetRender('search')
      expect(isRender.value).toBe(true)

      localConfig.search.enabled = false
      expect(isRender.value).toBe(false)
    })
  })

  describe('switchSettingDrawerVisible', () => {
    it('sets isSettingDrawerVisible to true', async () => {
      const mod = await import('@/logic/store/state')
      mod.switchSettingDrawerVisible(true)
      expect(mod.globalState.isSettingDrawerVisible).toBe(true)
    })

    it('sets isSettingDrawerVisible to false', async () => {
      const mod = await import('@/logic/store/state')
      mod.switchSettingDrawerVisible(false)
      expect(mod.globalState.isSettingDrawerVisible).toBe(false)
    })
  })

  describe('openChangelogModal', () => {
    it('sets isChangelogModalVisible to true', async () => {
      const mod = await import('@/logic/store/state')
      mod.openChangelogModal()
      expect(mod.globalState.isChangelogModalVisible).toBe(true)
    })
  })

  describe('currDayjsLang', () => {
    it('returns lang based on timeLang config', async () => {
      const { localConfig } = await import('@/logic/config/state')
      const { currDayjsLang } = await import('@/logic/store/theme')
      localConfig.general.timeLang = 'zh-CN'
      expect(currDayjsLang.value).toBe('zh-cn')

      localConfig.general.timeLang = 'en-US'
      expect(currDayjsLang.value).toBe('en')
    })

    it('falls back to en for unknown lang', async () => {
      const { localConfig } = await import('@/logic/config/state')
      const { currDayjsLang } = await import('@/logic/store/theme')
      localConfig.general.timeLang = 'unknown'
      expect(currDayjsLang.value).toBe('en')
    })
  })
})
