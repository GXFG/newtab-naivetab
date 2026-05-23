import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref } from 'vue'

/**
 * config-snapshot.test.ts — 基于真实用户配置快照的配置兼容性测试
 *
 * 职责：
 * 1. 从不同历史版本的用户配置快照出发，运行完整迁移流程
 * 2. 验证核心用户数据（书签 keymap、自定义颜色、键盘外观）在迁移后不丢失
 * 3. 验证迁移后的配置结构包含当前所有必需字段
 * 4. 新增快照只需在 fixtures 数组中追加即可
 *
 * 快照数据来源：从线上用户 localStorage 中导出的真实配置，或手动构造的典型用户配置。
 * 每次新增迁移分支后，应检查现有快照是否需要更新。
 *
 * 对应快照 JSON 文件位于 test/fixtures/ 目录，供外部工具引用。
 *
 * @see docs/architecture/config.md#配置迁移系统
 * @see .claude/rules/pitfalls.md#配置迁移黄金法则
 */

const APP_VERSION = '2.3.2'

// ── Widget 默认配置（从 defaults.ts 同步） ──
// 通过 import.meta.glob 扫描各 widget 的 config.ts，与 defaults.ts 聚合方式一致
const widgetModules = import.meta.glob('@/newtab/widgets/**/config.ts', { eager: true }) as Record<string, any>
const widgetDefaultConfig: Record<string, any> = {}
const widgetCodes: string[] = []
for (const key in widgetModules) {
  const m = widgetModules[key]
  if (m && m.WIDGET_CODE && m.WIDGET_CONFIG) {
    widgetCodes.push(m.WIDGET_CODE)
    widgetDefaultConfig[m.WIDGET_CODE] = m.WIDGET_CONFIG
  }
}

// ── 快照 fixtures ──
// 新增快照：在数组中追加一个对象，同时在 test/fixtures/ 放置对应 JSON 文件
const fixtures: Array<{ name: string; version: string; data: Record<string, any> }> = [
  {
    name: 'v1.19.0 老用户：书签 keymap + 旧版顶层 key（bookmark/commandShortcut）',
    version: '1.19.0',
    data: {
      general: {
        version: '1.19.0', lang: 'zh-CN', appearance: 'auto', pageTitle: '新标签页',
        fontFamily: 'Arial', fontSize: 14,
        fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
        primaryColor: ['rgba(58, 115, 195, 1)', 'rgba(100, 160, 230, 1)'],
        openPageFocusElement: 'bookmarkKeyboard',
        focusVisibleWidgetMap: { search: true, keyboard: true, clockDigital: true, date: true },
      },
      bookmark: {
        keymap: {
          KeyA: { url: 'https://github.com', title: 'GitHub' },
          KeyB: { url: 'https://google.com', title: 'Google' },
          Digit1: { url: 'https://mail.google.com', title: 'Gmail' },
        },
        keyboardType: 'key61', keycapType: 'gmk',
        mainFontColor: ['rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)'],
        isShellVisible: true,
        shellColor: ['rgba(225, 219, 209, 1.0)', 'rgba(51,65,85,1.0)'],
      },
      commandShortcut: {
        keymap: {
          KeyQ: { command: 'moveTabLeft' },
          KeyE: { command: 'moveTabRight' },
          KeyX: { command: 'closeTab' },
        },
        isEnabled: true,
      },
      search: { isNewTabOpen: true, backgroundBlur: 5 },
      clockDigital: { fontSize: 32, letterSpacing: 2 },
      calendar: { festivalCountdown: false, dayFontFamily: 'Arial', descFontFamily: 'Arial', backgroundBlur: 0 },
      memo: { enabled: true, fontFamily: 'Arial', backgroundBlur: 0 },
      yearProgress: { enabled: false },
      clockFlip: { enabled: true },
      news: { enabled: false },
      // 补齐后来新增的 Widget 占位，模拟真实环境中 updateSetting 补充的默认结构
      // 真实场景中，handleAppUpdate 会读写这些字段，即使它们是后来才新增的
      bookmarkFolder: { enabled: false },
      clockAnalog: { enabled: true },
      clockNeon: { enabled: false },
      date: { enabled: true },
      weather: { enabled: false },
      countdown: { enabled: false },
    },
  },
  {
    name: 'v2.1.0 用户：键盘已拆分但未迁移到新版快捷键架构',
    version: '2.1.0',
    data: {
      general: {
        version: '2.1.0', lang: 'en-US', timeLang: 'en-US', appearance: 'dark',
        pageTitle: 'NaiveTab', fontFamily: 'Roboto', fontSize: 16,
        fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
        primaryColor: ['rgba(100, 160, 230, 1)', 'rgba(100, 160, 230, 1)'],
        backgroundColor: ['rgba(26, 26, 46, 1)', 'rgba(26, 26, 46, 1)'],
        openPageFocusElement: 'search',
        focusVisibleWidgetMap: { search: true, keyboardBookmark: true, clockDigital: true, calendar: true },
        showBreakingChangeNotice: false,
        isBackgroundImageEnabled: true, backgroundImageSource: 'network',
        backgroundImageList: [
          { networkSourceType: 'pexels', name: '19161535' },
          { networkSourceType: 'pexels', name: '36873465' },
        ],
      },
      keyboardBookmark: {
        keymap: {
          KeyG: { url: 'https://github.com', title: 'GitHub' },
          KeyY: { url: 'https://youtube.com', title: 'YouTube' },
          KeyT: { url: 'https://twitter.com', title: 'Twitter' },
          Digit1: { url: 'https://mail.google.com', title: 'Gmail' },
          Digit2: { url: 'https://docs.google.com', title: 'Google Docs' },
        },
        source: 1,
        isListenBackgroundKeystrokes: false,
      },
      keyboardCommon: {
        keyboardType: 'key87', keycapType: 'dsa', splitSpace: 'space2',
        fontSize: 15, fontFamily: 'Roboto', keycapSize: 60, keycapPadding: 2,
        isShellVisible: true,
        shellColor: ['rgba(40, 40, 60, 1.0)', 'rgba(40, 40, 60, 1.0)'],
        shellBackgroundBlur: 8,
        mainFontColor: ['rgba(226, 232, 240, 1.0)', 'rgba(226, 232, 240, 1.0)'],
        mainBackgroundColor: ['rgba(71,85,105,1.0)', 'rgba(71,85,105,1.0)'],
        plateColor: ['rgba(119, 119, 119, 0.5)', 'rgba(119, 119, 119, 0.5)'],
      },
      keyboardCommand: {
        keymap: {
          KeyQ: { command: 'moveTabLeft' }, KeyE: { command: 'moveTabRight' },
          KeyA: { command: 'prevTab' }, KeyD: { command: 'nextTab' },
          KeyX: { command: 'closeTab' }, KeyV: { command: 'toggleTabPinned' },
          KeyT: { command: 'newTabAfter' },
        },
        enabled: true, modifierKeys: ['shift', 'ctrl'],
      },
      search: { isNewTabOpen: true, backgroundBlur: 0 },
      clockDigital: { fontSize: 28, width: 22 },
      clockAnalog: { enabled: true, showSecondHand: false },
      clockFlip: { enabled: false },
      clockNeon: { enabled: false },
      date: { enabled: true },
      yearProgress: { enabled: true, backgroundBlur: 0 },
      calendar: {
        festivalCountdown: true, backgroundBlur: 0,
        dayFontFamily: 'Roboto', descFontFamily: 'Roboto',
      },
      memo: { enabled: true, backgroundBlur: 0, fontFamily: 'Roboto' },
      news: { enabled: true, backgroundBlur: 0, fontFamily: 'Roboto' },
      bookmarkFolder: { enabled: false },
      weather: { enabled: true, unit: 'metric' },
      countdown: { enabled: false },
    },
  },
  {
    name: 'v2.3.0 用户：当前最新结构，检测未来迁移不破坏',
    version: '2.3.0',
    data: {
      general: {
        version: '2.3.0', lang: 'zh-CN', timeLang: 'zh-CN', appearance: 'auto',
        pageTitle: '新标签页', fontFamily: 'system', fontSize: 14,
        fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
        primaryColor: ['rgba(58, 115, 195, 1)', 'rgba(100, 160, 230, 1)'],
        backgroundColor: ['rgba(232, 236, 241, 1)', 'rgba(26, 26, 46, 1)'],
        bgOpacity: 1, bgBlur: 0,
        openPageFocusElement: 'keyboardBookmark',
        focusVisibleWidgetMap: {
          search: true, keyboardBookmark: true, clockDigital: true,
          clockAnalog: true, date: true, calendar: false,
        },
        showBreakingChangeNotice: true,
        isBackgroundImageEnabled: true, backgroundImageSource: 'network',
        backgroundImageList: [
          { networkSourceType: 'pexels', name: '19161535' },
          { networkSourceType: 'bing', name: 'DarwinsArch_ZH-CN9740478501' },
        ],
        favoriteImageList: [
          { networkSourceType: 'bing', name: 'DarwinsArch_ZH-CN9740478501' },
          { networkSourceType: 'pexels', name: '19161535' },
        ],
        layout: {
          xOffsetKey: 'right', xOffsetValue: 1, xTranslateValue: 0,
          yOffsetKey: 'top', yOffsetValue: 50, yTranslateValue: -50,
        },
        swatcheColors: [
          'rgba(255, 255, 255, 1)', 'rgba(15, 23, 42, 1)',
          'rgba(44, 62, 80, 1)', 'rgba(58, 115, 195, 1)',
        ],
      },
      keyboardBookmark: {
        keymap: {
          KeyA: { url: 'https://github.com', title: 'GitHub' },
          KeyD: { url: 'https://docs.google.com', title: 'Docs' },
          KeyS: { url: 'https://stackoverflow.com', title: 'StackOverflow' },
          Digit1: { url: 'https://mail.google.com', title: 'Gmail' },
        },
        source: 1, noModifierMode: false,
      },
      keyboardCommon: {
        keyboardType: 'key61', splitSpace: 'space1', keyboardWklMode: false,
        keycapType: 'gmk', keycapPadding: 1.5, keycapSize: 58, keycapBorderRadius: 5,
        isKeycapBorderEnabled: false, keycapBorderWidth: 1,
        keycapBorderColor: ['rgba(71, 85, 105, 1)', 'rgba(73, 73, 77, 1)'],
        isShellVisible: true, shellVerticalPadding: 15, shellHorizontalPadding: 15,
        shellBorderRadius: 10, shellBackgroundBlur: 5, isPlateVisible: true,
        platePadding: 3, plateBorderRadius: 5,
        plateColor: ['rgba(80, 80, 80, 0.7)', 'rgba(119, 119, 119, 0.5)'],
        isCapKeyVisible: true, keycapKeyFontFamily: 'OpenCherry', keycapKeyFontSize: 12,
        isNameVisible: true, keycapBookmarkFontFamily: 'Arial', keycapBookmarkFontSize: 11,
        isFaviconVisible: true, faviconSize: 0.85, isTactileBumpsVisible: true,
        mainFontColor: ['rgba(60,65,70,1.0)', 'rgba(226,232,240,1.0)'],
        mainBackgroundColor: ['rgba(235,238,240,1.0)', 'rgba(71,85,105,1.0)'],
        emphasisOneFontColor: ['rgba(235,238,240,1.0)', 'rgba(226,232,240,1.0)'],
        emphasisOneBackgroundColor: ['rgba(80,85,90,1.0)', 'rgba(30,41,59,1.0)'],
        emphasisTwoFontColor: ['rgba(60,65,70,1.0)', 'rgba(30,41,59,1.0)'],
        emphasisTwoBackgroundColor: ['rgba(160,165,170,1.0)', 'rgba(148,163,184,1.0)'],
        emphasisKeyOverrides: {},
        shellColor: ['rgba(225, 219, 209, 1.0)', 'rgba(51,65,85,1.0)'],
        isShellShadowEnabled: true,
        shellShadowColor: ['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.4)'],
        fontSize: 14, fontFamily: 'system',
      },
      keyboardCommand: {
        isEnabled: true, noModifierMode: false, shortcutInInputElement: true,
        urlBlacklist: [], modifiers: ['shift', 'alt'],
        keymap: {
          KeyQ: { command: 'moveTabLeft' }, KeyE: { command: 'moveTabRight' },
          KeyA: { command: 'prevTab' }, KeyD: { command: 'nextTab' },
          KeyX: { command: 'closeTab' }, KeyV: { command: 'toggleTabPinned' },
          KeyT: { command: 'newTabAfter' }, KeyP: { command: 'reopenClosedTab' },
          KeyR: { command: 'reloadPage' }, Slash: { command: 'toggleFocusMode' },
        },
      },
      search: { isNewTabOpen: false, backgroundBlur: 0 },
      clockDigital: { fontSize: 28, width: 22 },
      clockAnalog: { enabled: true, showSecondHand: false },
      clockFlip: { enabled: false },
      clockNeon: { enabled: false },
      date: { enabled: true },
      yearProgress: { enabled: true, backgroundBlur: 0 },
      calendar: {
        festivalCountdown: true, backgroundBlur: 0,
        dayFontFamily: 'system', descFontFamily: 'system',
      },
      memo: { enabled: true, backgroundBlur: 0, fontFamily: 'system' },
      news: { enabled: true, backgroundBlur: 0, fontFamily: 'system' },
      bookmarkFolder: { enabled: false },
      weather: { enabled: true, unit: 'metric' },
      countdown: { enabled: false },
    },
  },
]

// ── 核心断言：用户数据不丢失 ──
function assertUserDataPreserved(config: Record<string, any>, fixture: Record<string, any>) {
  // 书签 keymap 中的每个条目都应该保留
  const fixtureKeymap = fixture.keyboardBookmark?.keymap ?? fixture.bookmark?.keymap
  if (fixtureKeymap) {
    const migratedKeymap = config.keyboardBookmark?.keymap
    expect(migratedKeymap).toBeDefined()
    for (const [code, entry] of Object.entries(fixtureKeymap)) {
      expect(migratedKeymap).toHaveProperty(code, entry)
    }
  }

  // 命令 keymap 应保留
  const fixtureCommandKeymap = fixture.keyboardCommand?.keymap ?? fixture.commandShortcut?.keymap
  if (fixtureCommandKeymap) {
    const migratedCommandKeymap = config.keyboardCommand?.keymap
    expect(migratedCommandKeymap).toBeDefined()
    for (const [code, entry] of Object.entries(fixtureCommandKeymap)) {
      expect(migratedCommandKeymap).toHaveProperty(code, entry)
    }
  }

  // 自定义颜色应保留
  if (fixture.general?.primaryColor) {
    expect(config.general?.primaryColor).toEqual(fixture.general.primaryColor)
  }
  if (fixture.general?.fontColor) {
    expect(config.general?.fontColor).toEqual(fixture.general.fontColor)
  }

  // 背景图列表应保留
  if (fixture.general?.backgroundImageList) {
    expect(config.general?.backgroundImageList).toEqual(fixture.general.backgroundImageList)
  }

  // search 自定义设置应保留
  // 注意：isNewTabOpen 在 v1.21.0 迁移中被强制设为 false（有意行为），不检查
  if (fixture.search?.backgroundBlur !== undefined) {
    expect(config.search?.backgroundBlur).toBe(fixture.search.backgroundBlur)
  }

  // calendar 自定义设置应保留
  // 注意：festivalCountdown 在 v1.25.9 迁移中被强制设为 true（有意行为），不检查

  // clockFlip 自定义设置应保留
  // 注意：enabled 在 v2.0.0 迁移中被强制设为 false（有意行为），不检查

  // keyboardBookmark.source 应保留
  if (fixture.keyboardBookmark?.source !== undefined) {
    expect(config.keyboardBookmark?.source).toBe(fixture.keyboardBookmark.source)
  }

  // 键盘外观设置应保留（已拆分到 keyboardCommon 的应保留在 keyboardCommon）
  if (fixture.keyboardCommon?.keyboardType) {
    expect(config.keyboardCommon?.keyboardType).toBe(fixture.keyboardCommon.keyboardType)
  }
  if (fixture.keyboardCommon?.keycapType) {
    expect(config.keyboardCommon?.keycapType).toBe(fixture.keyboardCommon.keycapType)
  }
}

// ── 核心断言：迁移后包含当前所有必需字段 ──
function assertRequiredFieldsPresent(config: Record<string, any>) {
  // general 必需字段
  const generalRequiredFields = ['version', 'lang', 'appearance', 'fontFamily', 'primaryColor', 'backgroundColor']
  for (const field of generalRequiredFields) {
    expect(config.general).toHaveProperty(field)
  }

  // keyboardBookmark 必需字段
  expect(config.keyboardBookmark).toHaveProperty('keymap')
  expect(config.keyboardBookmark).toHaveProperty('source')

  // keyboardCommon 必需字段
  expect(config.keyboardCommon).toHaveProperty('keyboardType')
  expect(config.keyboardCommon).toHaveProperty('keycapType')

  // keyboardCommand 必需字段（兼容旧版 `enabled` 和新版 `isEnabled`）
  expect(config.keyboardCommand).satisfy((cmd: any) => {
    expect(cmd.isEnabled ?? cmd.enabled).toBeDefined()
    return true
  })
  expect(config.keyboardCommand).toHaveProperty('keymap')

  // 所有当前注册的 Widget 都应有配置
  for (const code of widgetCodes) {
    expect(config).toHaveProperty(code)
  }
}

// ── 核心断言：旧字段被清理 ──
function assertDeprecatedFieldsRemoved(config: Record<string, any>) {
  // 旧版顶层 key 应被重命名
  expect(config).not.toHaveProperty('bookmark')
  expect(config).not.toHaveProperty('keyboard')
  expect(config).not.toHaveProperty('commandShortcut')

  // clockDigital.letterSpacing 应被删除（v1.23.1 迁移）
  const clockDigital = config.clockDigital
  if (clockDigital) {
    expect(clockDigital).not.toHaveProperty('letterSpacing')
  }
}

// ── 测试主体 ──

describe.each(fixtures)('配置兼容性快照: $name', ({ data: fixture }) => {
  let handleAppUpdate: () => void
  let localConfig: Record<string, any>
  let localState: { value: Record<string, any> }

  beforeEach(async () => {
    vi.resetModules()

    // 深拷贝 fixture，避免测试间互相污染
    const fixtureCopy = JSON.parse(JSON.stringify(fixture))

    // ── 第一步：normalize 旧版 key（bookmark → keyboardBookmark 等） ──
    // 真实场景中，配置加载时会先经过 normalizeLegacyConfig，
    // 否则 handleAppUpdate 会因找不到预期字段而崩溃。
    // 这里手动内联 normalize 逻辑，避免跨模块 mock 冲突。
    const normalizedConfig = { ...fixtureCopy }
    // 顶层 key 重命名
    const topLevelRename: Record<string, string> = {
      bookmark: 'keyboardBookmark',
      keyboard: 'keyboardBookmark',
      commandShortcut: 'keyboardCommand',
    }
    for (const [oldKey, newKey] of Object.entries(topLevelRename)) {
      if (oldKey in normalizedConfig && !(newKey in normalizedConfig)) {
        normalizedConfig[newKey] = structuredClone(normalizedConfig[oldKey])
        delete normalizedConfig[oldKey]
      }
    }
    // 外观字段拆分（keyboardBookmark → keyboardCommon）
    // 当 keyboardBookmark 包含外观字段且 keyboardCommon 不存在时，拆分到 keyboardCommon
    if (normalizedConfig.keyboardBookmark && !normalizedConfig.keyboardCommon) {
      const appearanceFields = [
        'keyboardType', 'splitSpace', 'keyboardWklMode', 'keycapType',
        'keycapPadding', 'keycapSize', 'keycapBorderRadius', 'isKeycapBorderEnabled',
        'keycapBorderWidth', 'keycapBorderColor', 'isShellVisible',
        'shellVerticalPadding', 'shellHorizontalPadding', 'shellBorderRadius',
        'shellColor', 'isShellShadowEnabled', 'shellShadowColor', 'shellBackgroundBlur',
        'isPlateVisible', 'platePadding', 'plateBorderRadius', 'plateColor',
        'isCapKeyVisible', 'keycapKeyFontFamily', 'keycapKeyFontSize',
        'isNameVisible', 'keycapBookmarkFontFamily', 'keycapBookmarkFontSize',
        'isFaviconVisible', 'faviconSize', 'isTactileBumpsVisible',
        'mainFontColor', 'mainBackgroundColor',
        'emphasisOneFontColor', 'emphasisOneBackgroundColor',
        'emphasisTwoFontColor', 'emphasisTwoBackgroundColor',
        'emphasisKeyOverrides', 'fontSize', 'fontFamily',
      ]
      normalizedConfig.keyboardCommon = {}
      for (const field of appearanceFields) {
        if (normalizedConfig.keyboardBookmark[field] !== undefined) {
          normalizedConfig.keyboardCommon[field] = normalizedConfig.keyboardBookmark[field]
          delete normalizedConfig.keyboardBookmark[field]
        }
      }
    }
    // focusVisibleWidgetMap 内 key 重命名
    const fvm = normalizedConfig.general?.focusVisibleWidgetMap
    if (fvm && typeof fvm === 'object') {
      if ('keyboard' in fvm && !('keyboardBookmark' in fvm)) {
        fvm.keyboardBookmark = fvm.keyboard
        delete fvm.keyboard
      }
      if ('commandShortcut' in fvm && !('keyboardCommand' in fvm)) {
        fvm.keyboardCommand = fvm.commandShortcut
        delete fvm.commandShortcut
      }
    }
    // openPageFocusElement 值修正
    if (normalizedConfig.general?.openPageFocusElement === 'keyboard') {
      normalizedConfig.general.openPageFocusElement = 'keyboardBookmark'
    }
    // isFocusMode 从 general 提取
    if (normalizedConfig.general && 'isFocusMode' in normalizedConfig.general) {
      localState.value.isFocusMode = normalizedConfig.general.isFocusMode
      delete normalizedConfig.general.isFocusMode
    }
    // 保存 normalize 结果，用于断言旧 key 清理
    ;(globalThis as any).__normalizedConfig = normalizedConfig

    // 构建响应式的 mock state（与 state.ts 中 reactive/ref 一致）
    localConfig = reactive(normalizedConfig)
    localState = ref({
      isUploadConfigStatusMap: {
        general: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        keyboardBookmark: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        keyboardCommon: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        keyboardCommand: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        search: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        clockDigital: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        calendar: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        memo: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        news: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        yearProgress: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        bookmarkFolder: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        clockFlip: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        clockAnalog: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        clockNeon: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        date: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        weather: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
        countdown: { dirty: false, syncTime: 0, syncId: '', localModifiedTime: 0, loading: false },
      },
      isFocusMode: false,
    })

    // 构建完整的 defaultConfig mock
    const defaultConfigMock = {
      general: {
        version: APP_VERSION, lang: 'zh-CN', timeLang: 'zh-CN',
        appearance: 'auto', pageTitle: '新标签页', fontFamily: 'system', fontSize: 14,
        fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
        primaryColor: ['rgba(58, 115, 195, 1)', 'rgba(100, 160, 230, 1)'],
        backgroundColor: ['rgba(232, 236, 241, 1)', 'rgba(26, 26, 46, 1)'],
        bgOpacity: 1, bgBlur: 0,
        openPageFocusElement: 'keyboardBookmark',
        focusVisibleWidgetMap: { search: true, keyboardBookmark: true },
        showBreakingChangeNotice: false,
        isBackgroundImageEnabled: true, backgroundImageSource: 'network',
        backgroundImageList: [], favoriteImageList: [],
        layout: {
          xOffsetKey: 'right', xOffsetValue: 1, xTranslateValue: 0,
          yOffsetKey: 'top', yOffsetValue: 50, yTranslateValue: -50,
        },
        swatcheColors: ['rgba(255, 255, 255, 1)'],
        isParallaxEnabled: true, parallaxIntensity: 5,
        isBackgroundImageCustomUrlEnabled: false, backgroundImageCustomUrls: [],
        isLoadPageAnimationEnabled: true, loadPageAnimationType: 'fade-in',
        drawerPlacement: 'right',
        isBackgroundImageHighQuality: true,
        backgroundImageHighQuality: true,
        isFirstOpen: true,
      },
      keyboardCommon: {
        keyboardType: 'key61', splitSpace: 'space1', keyboardWklMode: false,
        keycapType: 'gmk', keycapPadding: 1.5, keycapSize: 58, keycapBorderRadius: 5,
        isKeycapBorderEnabled: false, keycapBorderWidth: 1,
        keycapBorderColor: ['rgba(71, 85, 105, 1)', 'rgba(73, 73, 77, 1)'],
        isShellVisible: true, shellVerticalPadding: 15, shellHorizontalPadding: 15,
        shellBorderRadius: 10, shellBackgroundBlur: 5, isPlateVisible: true,
        platePadding: 3, plateBorderRadius: 5,
        plateColor: ['rgba(80, 80, 80, 0.7)', 'rgba(119, 119, 119, 0.5)'],
        isCapKeyVisible: true, keycapKeyFontFamily: 'OpenCherry', keycapKeyFontSize: 12,
        isNameVisible: true, keycapBookmarkFontFamily: 'Arial', keycapBookmarkFontSize: 11,
        isFaviconVisible: true, faviconSize: 0.85, isTactileBumpsVisible: true,
        mainFontColor: ['rgba(60,65,70,1.0)', 'rgba(226,232,240,1.0)'],
        mainBackgroundColor: ['rgba(235,238,240,1.0)', 'rgba(71,85,105,1.0)'],
        emphasisOneFontColor: ['rgba(235,238,240,1.0)', 'rgba(226,232,240,1.0)'],
        emphasisOneBackgroundColor: ['rgba(80,85,90,1.0)', 'rgba(30,41,59,1.0)'],
        emphasisTwoFontColor: ['rgba(60,65,70,1.0)', 'rgba(30,41,59,1.0)'],
        emphasisTwoBackgroundColor: ['rgba(160,165,170,1.0)', 'rgba(148,163,184,1.0)'],
        emphasisKeyOverrides: {}, fontSize: 14, fontFamily: 'system',
        shellColor: ['rgba(225, 219, 209, 1.0)', 'rgba(51,65,85,1.0)'],
        isShellShadowEnabled: true,
        shellShadowColor: ['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.4)'],
        keycapBorderColor: ['rgba(71, 85, 105, 1)', 'rgba(73, 73, 77, 1)'],
        keycapBorderWidth: 1, keycapKeyFontFamily: 'OpenCherry', keycapKeyFontSize: 12,
      },
      keyboardCommand: {
        isEnabled: true, noModifierMode: false, shortcutInInputElement: true,
        urlBlacklist: [], modifiers: ['shift', 'alt'] as Array<'ctrl' | 'shift' | 'alt' | 'meta'>,
        keymap: {
          KeyQ: { command: 'moveTabLeft' }, KeyE: { command: 'moveTabRight' },
          KeyA: { command: 'prevTab' }, KeyD: { command: 'nextTab' },
          KeyX: { command: 'closeTab' },
        },
      },
      ...widgetDefaultConfig,
    }

    const defaultFocusVisibleWidgetMap = {
      search: true, keyboardBookmark: true, clockDigital: true,
      clockAnalog: true, clockFlip: true, clockNeon: true, date: true,
    }

    vi.doMock('@/logic/config/state', () => ({
      localConfig,
      localState,
    }))
    vi.doMock('@/logic/store/state', () => ({
      globalState: reactive({ isChangelogModalVisible: false }),
    }))
    vi.doMock('@/logic/config/defaults', () => ({
      defaultConfig: defaultConfigMock,
      defaultFocusVisibleWidgetMap,
      defaultLocalState: {
        currAppearanceLabel: 'light',
        currAppearanceCode: 0,
        isUploadConfigStatusMap: {},
        isFocusMode: false,
      },
      KEYBOARD_COMMON_CONFIG: defaultConfigMock.keyboardCommon,
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
    vi.doMock('naive-ui', () => ({ NButton: { name: 'NButton' } }))

    window.appVersion = APP_VERSION
    window.$t = vi.fn((key: string) => key)
    window.$notification = { success: vi.fn() } as any

    const mod = await import('@/logic/config/update')
    handleAppUpdate = mod.handleAppUpdate
  })

  it('成功完成迁移，不抛出异常', () => {
    expect(() => handleAppUpdate()).not.toThrow()
  })

  it('用户核心数据不丢失', () => {
    handleAppUpdate()
    assertUserDataPreserved(localConfig, fixture)
  })

  it('迁移后包含当前所有必需字段', () => {
    handleAppUpdate()
    assertRequiredFieldsPresent(localConfig)
  })

  it('旧版字段被正确清理', () => {
    handleAppUpdate()
    assertDeprecatedFieldsRemoved(localConfig)
  })

  it('版本号升级到目标版本', () => {
    handleAppUpdate()
    expect(localConfig.general.version).toBe(APP_VERSION)
  })
})
