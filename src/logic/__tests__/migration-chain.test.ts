/**
 * migration-chain.test.ts — 迁移链本身的约束与等价性
 *
 * 这里不验证「某个字段迁没迁对」（那由 config-snapshot / config-migrate 负责），
 * 只验证链条的结构性不变量：
 * 1. 步骤表按版本严格升序，且不会出现「写了但永不执行」的未来版本
 * 2. fromVersion 门限生效：高于源版本的步骤不执行
 * 3. import 与 upgrade 得到完全相同的结果（防止两条路再次分叉）
 * 4. import 模式绝不碰本机 localStorage / localState
 * 5. 幂等：对已是最新版本的配置再跑一次应该零步骤
 *
 * @see docs/architecture/config.md#配置迁移系统
 */
import { describe, it, expect, beforeEach } from 'vitest'
import pkg from '../../../package.json'
import {
  defaultConfig,
  defaultFocusVisibleWidgetMap,
} from '@/logic/config/defaults'
import { MIGRATION_STEPS } from '@/logic/config/migrations'
import {
  normalizeStructure,
  runMigrations,
  type ConfigDraft,
  type MigrationHost,
} from '@/logic/config/migrate'
import { compareLeftVersionLessThanRightVersions } from '@/logic/config/version'

const APP_VERSION = pkg.version

/** 以默认配置为骨架叠加快照数据，模拟「完整的 localConfig」 */
const seed = (fixture: ConfigDraft): ConfigDraft => {
  const base = structuredClone(defaultConfig) as ConfigDraft
  for (const [key, value] of Object.entries(fixture)) {
    base[key] = { ...(base[key] ?? {}), ...structuredClone(value) }
  }
  return base
}

/** 什么都不做的 host：等价于「本机没有任何旧 localStorage 键」 */
const noopHost = (): MigrationHost => ({
  markBreakingChange: () => {},
  setFocusMode: () => {},
  takeLegacyStorage: () => undefined,
})

const LEGACY_FIXTURES: Array<{
  name: string
  version: string
  data: ConfigDraft
}> = [
  {
    name: 'v1.19.0：bookmark 旧键 + 外观字段未拆分',
    version: '1.19.0',
    data: {
      general: {
        version: '1.19.0',
        lang: 'zh-CN',
        fontFamily: 'Arial',
        openPageFocusElement: 'bookmarkKeyboard',
        focusVisibleWidgetMap: { search: true, keyboard: true },
        backgroundImageNames: ['a.jpg', 'b.jpg'],
        backgroundNetworkSourceType: 'bing',
      },
      bookmark: {
        keymap: { KeyA: { url: 'https://a.com', title: 'A' } },
        keyboardType: 'key87',
        mainFontColor: ['rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 1)'],
      },
      commandShortcut: { keymap: { KeyQ: { command: 'prevTab' } } },
      clockDigital: { fontSize: 32, letterSpacing: 2 },
      memo: { enabled: true, fontFamily: 'Arial' },
    },
  },
  {
    name: 'v2.1.0：键盘已拆分，backgroundImageList 尚未对象化',
    version: '2.1.0',
    data: {
      general: {
        version: '2.1.0',
        lang: 'en-US',
        timeLang: 'en-US',
        fontFamily: 'Roboto',
        openPageFocusElement: 'search',
        focusVisibleWidgetMap: { keyboardBookmark: true },
      },
      keyboardBookmark: {
        keymap: { KeyG: { url: 'https://github.com', title: 'GitHub' } },
        source: 1,
        isListenBackgroundKeystrokes: false,
      },
      keyboardCommon: { keyboardType: 'key87', keycapType: 'dsa' },
      keyboardCommand: { enabled: true, modifierKeys: ['shift', 'ctrl'] },
    },
  },
  {
    name: 'v2.3.0：接近当前结构，仅缺后续新增字段',
    version: '2.3.0',
    data: {
      general: {
        version: '2.3.0',
        lang: 'zh-CN',
        fontFamily: 'system',
        focusVisibleWidgetMap: { keyboardBookmark: true },
      },
      keyboardBookmark: {
        keymap: { KeyA: { url: 'https://a.com' } },
        source: 1,
      },
      keyboardCommon: { keyboardType: 'key61' },
      keyboardCommand: { isEnabled: true },
    },
  },
]

describe('迁移步骤表的结构约束', () => {
  it('版本号严格升序（后一步依赖前一步的结构）', () => {
    for (let i = 1; i < MIGRATION_STEPS.length; i += 1) {
      expect(
        compareLeftVersionLessThanRightVersions(
          MIGRATION_STEPS[i - 1].version,
          MIGRATION_STEPS[i].version,
        ),
        `步骤顺序错误：${MIGRATION_STEPS[i - 1].version} 不应在 ${MIGRATION_STEPS[i].version} 之后`,
      ).toBe(true)
    }
  })

  it('没有超过当前版本号的步骤（否则永远不会执行）', () => {
    for (const step of MIGRATION_STEPS) {
      expect(
        compareLeftVersionLessThanRightVersions(APP_VERSION, step.version),
        `步骤 ${step.version} 晚于当前版本 ${APP_VERSION}，永远不会被执行`,
      ).toBe(false)
    }
  })

  it('每一步都有说明文字', () => {
    for (const step of MIGRATION_STEPS) {
      expect(
        step.summary.length,
        `步骤 ${step.version} 缺少 summary`,
      ).toBeGreaterThan(0)
    }
  })
})

describe('runMigrations 版本门限', () => {
  it('只执行门限高于源版本的步骤', () => {
    const config = seed({})
    const { applied } = runMigrations(
      { mode: 'upgrade', config, defaults: defaultConfig, host: noopHost() },
      '2.6.1',
      APP_VERSION,
    )
    // 2.6.1 → 当前版本：只剩 2.6.2 与 2.7.0
    expect(applied).toEqual(['2.6.2', '2.7.0'])
  })

  it('已是最新版本时零步骤（幂等）', () => {
    const config = seed({})
    const before = JSON.stringify(config)
    const { applied } = runMigrations(
      { mode: 'upgrade', config, defaults: defaultConfig, host: noopHost() },
      APP_VERSION,
      APP_VERSION,
    )
    expect(applied).toEqual([])
    expect(JSON.stringify(config)).toBe(before)
  })

  it('目标版本低于某步骤时不执行该步骤', () => {
    const config = seed({})
    const { applied } = runMigrations(
      { mode: 'upgrade', config, defaults: defaultConfig, host: noopHost() },
      '2.6.0',
      '2.6.2',
    )
    expect(applied).not.toContain('2.7.0')
  })

  it('未知版本（0）会跑完所有步骤', () => {
    const config = seed({})
    const { applied } = runMigrations(
      { mode: 'import', config, defaults: defaultConfig },
      '0',
      APP_VERSION,
    )
    expect(applied).toEqual(MIGRATION_STEPS.map((step) => step.version))
  })
})

/** 先归一（改名可能因新键已存在而跳过，必须对原始数据做），再补默认骨架 */
const prepare = (data: ConfigDraft) =>
  seed(normalizeStructure(structuredClone(data)))

describe('import 与 upgrade 结果一致', () => {
  it.each(LEGACY_FIXTURES)('$name', ({ data, version }) => {
    const importDraft = prepare(data)
    const upgradeDraft = prepare(data)

    const imported = runMigrations(
      { mode: 'import', config: importDraft, defaults: defaultConfig },
      version,
      APP_VERSION,
    )
    const upgraded = runMigrations(
      {
        mode: 'upgrade',
        config: upgradeDraft,
        defaults: defaultConfig,
        host: noopHost(),
      },
      version,
      APP_VERSION,
    )

    expect(imported.applied).toEqual(upgraded.applied)

    // 唯一有意的差异：focusVisibleWidgetMap 的整表重建只在本机升级执行
    // （导入的备份已归一过键名，重置会抹掉用户的专注模式可见性设置）
    const omitFocusMap = (draft: ConfigDraft) => {
      const { focusVisibleWidgetMap: _omit, ...general } = draft.general
      return { ...draft, general }
    }
    expect(omitFocusMap(importDraft)).toEqual(omitFocusMap(upgradeDraft))
  })

  it('focusVisibleWidgetMap：升级重建、导入保留', () => {
    const data = {
      general: {
        version: '2.2.0',
        focusVisibleWidgetMap: { keyboard: false, search: true },
      },
    }
    const importDraft = normalizeStructure(structuredClone(data))
    runMigrations(
      { mode: 'import', config: importDraft, defaults: defaultConfig },
      data.general.version,
      APP_VERSION,
    )
    // 归一 + 不重置：用户的可见性设置保留（key 改名，值不变）
    expect(importDraft.general.focusVisibleWidgetMap).toEqual({
      keyboardBookmark: false,
      search: true,
    })

    const upgradeDraft = seed(structuredClone(data))
    runMigrations(
      {
        mode: 'upgrade',
        config: upgradeDraft,
        defaults: defaultConfig,
        host: noopHost(),
      },
      data.general.version,
      APP_VERSION,
    )
    // 升级：旧数据用的是旧 code，整表按默认值重建
    expect(upgradeDraft.general.focusVisibleWidgetMap).toEqual(
      defaultFocusVisibleWidgetMap,
    )
  })

  it('老备份的核心数据在两条路上都落到同一个位置', () => {
    const fixture = LEGACY_FIXTURES[0]
    // 不走 seed：模拟真实导入（文件本身只有它自己有的 section）
    const draft = normalizeStructure(structuredClone(fixture.data))
    runMigrations(
      { mode: 'import', config: draft, defaults: defaultConfig },
      fixture.version,
      APP_VERSION,
    )

    // bookmark 旧键 → keyboardBookmark
    expect(draft.keyboardBookmark.keymap.KeyA.url).toBe('https://a.com')
    // 旧键不能残留
    expect(draft.bookmark).toBeUndefined()
    expect(draft.commandShortcut).toBeUndefined()
    // 外观字段拆分后，keyboardBookmark 里不再有键盘类型
    expect(draft.keyboardBookmark.keyboardType).toBeUndefined()
    expect(draft.keyboardCommon.keyboardType).toBe('key87')
    // backgroundImageNames → backgroundImageList（对象数组）
    expect(draft.general.backgroundImageList).toEqual([
      { networkSourceType: 'bing', name: 'a.jpg' },
      { networkSourceType: 'bing', name: 'b.jpg' },
    ])
    expect(draft.general.backgroundImageNames).toBeUndefined()
  })
})

describe('import 模式不触碰本机状态', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('不消费旧 localStorage 键，也不会用它覆盖导入的数据', () => {
    localStorage.setItem(
      'c-keyboard',
      JSON.stringify({ keymap: { KeyZ: { url: 'https://local-only.com' } } }),
    )
    const draft = normalizeStructure(seed(LEGACY_FIXTURES[2].data))
    runMigrations(
      { mode: 'import', config: draft, defaults: defaultConfig },
      '2.3.0',
      APP_VERSION,
    )

    expect(localStorage.getItem('c-keyboard')).not.toBeNull()
    expect(draft.keyboardBookmark.keymap.KeyZ).toBeUndefined()
  })

  it('丢弃 general.isFocusMode，不写到 localState', () => {
    const draft = normalizeStructure(
      seed({ general: { version: '2.2.1', isFocusMode: true } }),
    )
    runMigrations(
      { mode: 'import', config: draft, defaults: defaultConfig },
      '2.2.1',
      APP_VERSION,
    )
    expect(draft.general.isFocusMode).toBeUndefined()
  })
})

describe('2.2.2 旧 localStorage 键合并', () => {
  /** 只提供旧键的 host */
  const hostWithLegacy = (legacy: Record<string, unknown>): MigrationHost => ({
    ...noopHost(),
    takeLegacyStorage: <T>(key: string) => legacy[key] as T | undefined,
  })

  /**
   * c-keyboard 是 2.2.2 之前的存储格式，2.2.0 才新增的 isGlobalShortcutEnabled
   * 在其中并不存在。若按默认字段全量赋值，会把它写成 undefined，
   * 覆盖掉 2.2.0 步骤刚算好的值（且 updateSetting 会跳过 undefined，
   * 该字段随后在下次启动时被默认值顶掉）。
   */
  it('旧键里不存在的字段不会被覆盖成 undefined', () => {
    const config = seed({
      general: { version: '2.1.0' },
      keyboardBookmark: {
        keymap: { KeyA: { url: 'https://a.com' } },
        isListenBackgroundKeystrokes: false,
      },
    })

    runMigrations(
      {
        mode: 'upgrade',
        config,
        defaults: defaultConfig,
        host: hostWithLegacy({
          'c-keyboard': {
            keymap: { KeyB: { url: 'https://b.com' } },
            keyboardType: 'key61',
            isListenBackgroundKeystrokes: false,
          },
        }),
      },
      '2.1.0',
      APP_VERSION,
    )

    // 2.2.0 步骤由 isListenBackgroundKeystrokes=false 推出 false，不能被 undefined 覆盖
    expect(config.keyboardBookmark.isGlobalShortcutEnabled).toBe(false)
    // 旧键里真实存在的字段照常生效
    expect(config.keyboardCommon.keyboardType).toBe('key61')
    expect(config.keyboardBookmark.keymap.KeyB).toEqual({
      url: 'https://b.com',
    })
  })

  it('旧键是损坏的原始类型时跳过而不是抛错', () => {
    const config = seed({ general: { version: '2.1.0' } })
    const host: MigrationHost = {
      ...noopHost(),
      // 旧键内容为 "oops" 这类原始类型：`in` 运算符作用其上会抛 TypeError
      takeLegacyStorage: () => 'oops' as unknown as undefined,
    }

    expect(() =>
      runMigrations(
        { mode: 'upgrade', config, defaults: defaultConfig, host },
        '2.1.0',
        APP_VERSION,
      ),
    ).not.toThrow()
    expect(config.keyboardBookmark.isGlobalShortcutEnabled).toBe(true)
  })
})
