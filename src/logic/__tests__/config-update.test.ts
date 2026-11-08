import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref } from 'vue'

/**
 * config-update.test.ts — 测试配置更新和版本迁移逻辑
 *
 * Mock 策略：在 import config/update 前 mock 所有依赖
 */

describe('config/update', () => {
  let handleStateResetAndUpdate: (typeof import('@/logic/config/update'))['handleStateResetAndUpdate']
  let updateSetting: (typeof import('@/logic/config/update'))['updateSetting']
  let handleAppUpdate: (typeof import('@/logic/config/update'))['handleAppUpdate']
  let getLocalVersion: (typeof import('@/logic/config/update'))['getLocalVersion']

  beforeEach(async () => {
    vi.resetModules()

    // Mock store with reactive state
    vi.doMock('@/logic/config/state', () => ({
      localConfig: reactive({
        general: {
          version: '1.0.0',
          timeLang: 'en',
          lang: 'en',
          openPageFocusElement: 'default',
          focusVisibleWidgetMap: {},
          isFocusMode: false,
        },
        keyboardBookmark: { keymap: {}, source: 0 },
        keyboardCommon: { fontSize: 14 },
        keyboardCommand: { enabled: true },
        search: { isNewTabOpen: false },
        clockDigital: { fontSize: 28, width: 22 },
        yearProgress: { enabled: true },
        calendar: {
          festivalCountdown: true,
          backgroundBlur: 0,
          dayFontFamily: 'Arial',
          descFontFamily: 'Arial',
        },
        memo: { backgroundBlur: 0, fontFamily: 'Arial' },
        news: { backgroundBlur: 0, fontFamily: 'Arial' },
        bookmarkFolder: { enabled: false },
        clockFlip: { enabled: true },
        weather: { enabled: false },
      }) as any,
      localState: ref({
        isUploadConfigStatusMap: {
          general: {
            dirty: false,
            syncTime: 0,
            syncId: '',
            localModifiedTime: 0,
            loading: false,
          },
        },
        isFocusMode: false,
      }),
      globalState: reactive({ isChangelogModalVisible: false }),
    }))

    // Mock config with all needed default fields
    vi.doMock('@/logic/config/defaults', () => ({
      defaultConfig: {
        general: { version: '2.2.5', timeLang: 'en' },
        keyboardBookmark: { keymap: {}, source: 1 },
        keyboardCommon: { fontSize: 14 },
        keyboardCommand: { enabled: true },
        search: { isNewTabOpen: true },
        clockDigital: { fontSize: 28, width: 22 },
        yearProgress: { enabled: true },
        calendar: {
          festivalCountdown: true,
          backgroundBlur: 0,
          dayFontFamily: 'system',
          descFontFamily: 'system',
        },
        memo: { backgroundBlur: 0 },
        news: { backgroundBlur: 0 },
        bookmarkFolder: { enabled: false },
        clockFlip: { enabled: false },
      },
      // 迁移引擎在模块作用域读取这两个导出
      KEYBOARD_COMMON_CONFIG: { fontSize: 14 },
      defaultFocusVisibleWidgetMap: { search: true, keyboardBookmark: true },
      defaultLocalState: {
        widgetInteractionOrder: [],
        isUploadConfigStatusMap: {
          general: {
            dirty: false,
            syncTime: 0,
            syncId: '',
            localModifiedTime: 0,
            loading: false,
          },
          keyboardBookmark: {
            dirty: false,
            syncTime: 0,
            syncId: '',
            localModifiedTime: 0,
            loading: false,
          },
          search: {
            dirty: false,
            syncTime: 0,
            syncId: '',
            localModifiedTime: 0,
            loading: false,
          },
        },
      },
      defaultFocusVisibleWidgetMap: { keyboardBookmark: true, search: true },
    }))

    // Mock config/merge: simple passthrough (acceptState wins when defined)
    vi.doMock('@/logic/config/merge', () => ({
      mergeState: vi.fn((state: unknown, acceptState: unknown) => {
        if (acceptState === undefined || acceptState === null) return state
        if (
          typeof acceptState === 'object' &&
          acceptState !== null &&
          typeof state === 'object' &&
          state !== null
        ) {
          const result: Record<string, unknown> = {}
          for (const key of Object.keys(state as object)) {
            if (Object.prototype.hasOwnProperty.call(acceptState, key)) {
              result[key] = (state as any)[key]
            } else {
              result[key] = (state as any)[key]
            }
          }
          return result
        }
        return acceptState
      }),
    }))

    // Mock util
    vi.doMock('@/logic/utils/util', () => ({
      log: vi.fn(),
      compareLeftVersionLessThanRightVersions: vi.fn(
        (left: string, right: string) => {
          const l = left.split('.').map(Number)
          const r = right.split('.').map(Number)
          for (let i = 0; i < Math.max(l.length, r.length); i++) {
            const a = l[i] || 0
            const b = r[i] || 0
            if (a < b) return true
            if (a > b) return false
          }
          return false
        },
      ),
    }))

    // Set window globals
    window.appVersion = '2.2.5'
    window.$t = vi.fn((key: string) => key)
    window.$notification = { success: vi.fn() } as any

    const mod = await import('@/logic/config/update')
    handleStateResetAndUpdate = mod.handleStateResetAndUpdate
    updateSetting = mod.updateSetting
    handleAppUpdate = mod.handleAppUpdate
    getLocalVersion = mod.getLocalVersion
  })

  describe('handleStateResetAndUpdate', () => {
    it('adds missing fields to isUploadConfigStatusMap', async () => {
      // Re-import to get the mocked localState
      const { localState } = await import('@/logic/config/state')

      // Only 'general' exists in isUploadConfigStatusMap before call
      const initialKeys = Object.keys(localState.value.isUploadConfigStatusMap)
      expect(initialKeys).toContain('general')

      // Should add 'keyboardBookmark' and 'search' from defaultLocalState
      handleStateResetAndUpdate()

      const afterKeys = Object.keys(localState.value.isUploadConfigStatusMap)
      expect(afterKeys).toContain('keyboardBookmark')
      expect(afterKeys).toContain('search')
    })

    it('removes stale fields that no longer exist in defaultConfig', async () => {
      const { localState } = await import('@/logic/config/state')

      // 模拟已下线 Widget 的残留同步状态
      localState.value.isUploadConfigStatusMap.removedWidget = {
        dirty: true,
        syncTime: 1,
        syncId: 'stale',
        localModifiedTime: 1,
        loading: false,
      }

      handleStateResetAndUpdate()

      // 残留项会被上传链路遍历（getUploadConfigData 返回 undefined → 垃圾 payload）
      expect(localState.value.isUploadConfigStatusMap).not.toHaveProperty(
        'removedWidget',
      )
      // 已知字段不受影响
      expect(localState.value.isUploadConfigStatusMap).toHaveProperty('general')
    })
  })

  describe('updateSetting', () => {
    it('merges acceptState into localConfig', async () => {
      const result = await updateSetting({
        general: { version: '2.0.0', timeLang: 'zh-CN' },
        search: { isNewTabOpen: true },
      } as any)
      expect(result).toBe(true)
    })

    it('only processes fields present in both defaultConfig and acceptState', async () => {
      const result = await updateSetting({
        general: { version: '2.0.0' },
        nonexistent: { foo: 'bar' } as any,
      } as any)
      expect(result).toBe(true)
    })

    it('returns true on success with undefined acceptState (defaults to localConfig)', async () => {
      const result = await updateSetting()
      expect(result).toBe(true)
    })

    it('returns false on error', async () => {
      // Pass an object that will cause an error during iteration
      const brokenState = { general: null } as any
      const result = await updateSetting(brokenState)
      expect(result).toBe(false)
    })
  })

  describe('getLocalVersion', () => {
    it('returns version from localConfig', () => {
      const version = getLocalVersion()
      expect(version).toBe('1.0.0')
    })
  })

  describe('handleAppUpdate', () => {
    it('v2.6.0 migration: sets shimmer/scaleMode fields for old config', async () => {
      // 目标版本要覆盖到被断言的迁移步骤：引擎会跳过晚于目标版本的步骤
      window.appVersion = '2.6.2'
      handleAppUpdate()

      const { localConfig } = await import('@/logic/config/state')
      expect(localConfig.general.scaleMode).toBe('auto')
      expect(localConfig.general.isAutoPrimaryColor).toBe(false)
      expect(localConfig.general.isAutoBackgroundColor).toBe(false)
      expect(localConfig.general.shimmerBackgroundEffect).toBe('aurora')
      expect(localConfig.general.shimmerBackgroundColors).toHaveLength(2)
      expect(localConfig.general.shimmerAnimationSpeed).toBe(1)
      // 升级后版本号更新为当前应用版本
      expect(localConfig.general.version).toBe('2.6.2')
    })

    it('v2.6.0 migration: preserves existing shimmer values', async () => {
      window.appVersion = '2.6.2'
      const { localConfig } = await import('@/logic/config/state')
      // 预设已有 shimmer 值，迁移不应覆盖
      localConfig.general = Object.assign(localConfig.general, {
        shimmerBackgroundEffect: 'fluid',
        shimmerBackgroundColors: [['#fff'], ['#000']],
        shimmerAnimationSpeed: 2,
      }) as any

      handleAppUpdate()

      expect(localConfig.general.shimmerBackgroundEffect).toBe('fluid')
      expect(localConfig.general.shimmerBackgroundColors[0]).toEqual(['#fff'])
      expect(localConfig.general.shimmerAnimationSpeed).toBe(2)
    })

    it('v2.6.1 migration: defaults isGaEnabled to true for old config', async () => {
      window.appVersion = '2.6.2'
      const { localConfig } = await import('@/logic/config/state')
      // 模拟老用户配置不含 isGaEnabled
      expect((localConfig.general as any).isGaEnabled).toBeUndefined()

      handleAppUpdate()

      expect(localConfig.general.isGaEnabled).toBe(true)
    })

    it('v2.6.1 migration: preserves existing isGaEnabled=false', async () => {
      window.appVersion = '2.6.2'
      const { localConfig } = await import('@/logic/config/state')
      ;(localConfig.general as any).isGaEnabled = false

      handleAppUpdate()

      expect(localConfig.general.isGaEnabled).toBe(false)
    })
  })
})
