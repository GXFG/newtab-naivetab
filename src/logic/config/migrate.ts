/**
 * @module migrate
 * @description 配置结构迁移引擎。分两段：
 *   1. normalizeStructure —— 键名归一（bookmark→keyboardBookmark 等），版本无关、幂等
 *   2. runMigrations —— 按版本升序执行 migrations.ts 的步骤表
 *
 *   归一必须独立于版本：后续步骤都按新键名寻址，若把改名做成某个版本的步骤，
 *   更早版本的步骤会写到还不存在的键上（静默丢数据）。
 *
 * 使用场景：
 * - 导入备份（mode: 'import'）：文件可能是任意历史版本，不注入 host
 * - 本机升级（mode: 'upgrade'）：需要旧 localStorage 键 / localState / 更新公告，注入 host
 *
 * @dependencies config/defaults.ts（默认值）、config/migrations.ts（步骤表）、config/version.ts
 * @pitfalls
 *   - 归一函数只处理「键名/值名映射」，不做任何语义变换，否则导入与升级会再次分叉
 *   - 引擎不写版本号、不弹 toast：这些属于入口收尾，避免导入旧备份时误触发更新公告
 *   - 步骤表 import 本模块的 MigrationStep 类型（type-only，不构成运行时循环依赖）
 * @see docs/architecture/config.md#配置迁移系统
 */
import { KEYBOARD_COMMON_CONFIG, defaultConfig } from '@/logic/config/defaults'
import { log } from '@/logic/utils/common'
import { compareLeftVersionLessThanRightVersions } from './version'
import { MIGRATION_STEPS } from './migrations'

/**
 * 顶层配置 key 重命名映射（old → new），按引入版本的时间顺序排列
 */
const TOP_LEVEL_RENAME_MAP: Record<string, string> = {
  // v1.27.0 前旧 key
  bookmark: 'keyboardBookmark',
  // v2.2.2 code 重命名
  keyboard: 'keyboardBookmark',
  commandShortcut: 'keyboardCommand',
}

/**
 * 外观字段列表（KEYBOARD_COMMON_CONFIG 的全部 key）
 * v2.2.2 从 keyboardBookmark 拆分到 keyboardCommon
 */
const APPEARANCE_FIELDS = Object.keys(KEYBOARD_COMMON_CONFIG)

/** 迁移的操作对象：升级时是 localConfig，导入时是解析出来的文件对象 */
export type ConfigDraft = Record<string, any>

export type MigrationMode = 'upgrade' | 'import'

/**
 * 只有本机升级才具备的能力。导入模式不注入 host，
 * 步骤里的 `ctx.host?.xxx()` 会自动跳过 —— 这是「导入不改本机状态」的结构性保证。
 */
export interface MigrationHost {
  /** 标记需要在启动时展示更新公告 */
  markBreakingChange(): void
  /** 写入 localState.isFocusMode */
  setFocusMode(value: boolean): void
  /** 读取并消费旧 localStorage 配置键（读完即删除） */
  takeLegacyStorage<T = unknown>(key: string): T | undefined
}

export interface MigrationContext {
  mode: MigrationMode
  config: ConfigDraft
  defaults: typeof defaultConfig
  host?: MigrationHost
}

export interface MigrationStep {
  /** 生效门限：源版本低于此值时执行 */
  version: string
  /** 日志与测试标题用 */
  summary: string
  apply(ctx: MigrationContext): void
}

export interface MigrationResult {
  /** 实际执行的步骤版本号，按执行顺序 */
  applied: string[]
}

const isPlainObject = (value: unknown) =>
  Object.prototype.toString.call(value) === '[object Object]'

/**
 * 将旧版本配置的键名归一为当前格式
 *
 * 处理内容：
 * 1. 顶层 key 重命名
 * 2. keyboardBookmark 外观字段拆分到 keyboardCommon
 * 3. focusVisibleWidgetMap 内 key 重命名
 * 4. openPageFocusElement 值修正
 *
 * 必须幂等：对已经是新格式的数据调用不应产生任何变化。
 */
export const normalizeStructure = (raw: ConfigDraft): ConfigDraft => {
  const config = { ...raw }

  // ── 1. 顶层 key 重命名 ──
  for (const [oldKey, newKey] of Object.entries(TOP_LEVEL_RENAME_MAP)) {
    if (oldKey in config && !(newKey in config)) {
      config[newKey] = structuredClone(config[oldKey])
      delete config[oldKey]
    }
  }

  // ── 2. 外观字段拆分（keyboardBookmark → keyboardCommon） ──
  if (config.keyboardBookmark && !config.keyboardCommon) {
    config.keyboardCommon = structuredClone(KEYBOARD_COMMON_CONFIG)
    for (const field of APPEARANCE_FIELDS) {
      if (config.keyboardBookmark[field] !== undefined) {
        config.keyboardCommon[field] = config.keyboardBookmark[field]
        delete config.keyboardBookmark[field]
      }
    }
  }

  // ── 3. focusVisibleWidgetMap 内 key 重命名 ──
  const fvm = config.general?.focusVisibleWidgetMap
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

  // ── 4. openPageFocusElement 值修正 ──
  if (config.general?.openPageFocusElement === 'keyboard') {
    config.general.openPageFocusElement = 'keyboardBookmark'
  }

  return config
}

/**
 * 按版本升序执行迁移步骤，就地修改 ctx.config。
 *
 * 不写版本号：调用方在成功后自行写入目标版本（导入写当前版本，升级写 appVersion）。
 */
export const runMigrations = (
  ctx: MigrationContext,
  fromVersion: string,
  toVersion: string,
): MigrationResult => {
  // 导入的文件可能缺整个 section，而步骤都假定 section 存在。
  // 这里只补空对象骨架，不补字段（字段默认值由 updateSetting 的 mergeState 负责）。
  // 升级路径的 localConfig 结构始终完整，不做这一层，保持行为不变。
  if (ctx.mode === 'import') {
    for (const field of Object.keys(ctx.defaults)) {
      if (!isPlainObject(ctx.config[field])) {
        ctx.config[field] = {}
      }
    }
  }

  const result: MigrationResult = { applied: [] }
  for (const step of MIGRATION_STEPS) {
    // 源版本低于门限才需要迁移
    if (!compareLeftVersionLessThanRightVersions(fromVersion, step.version)) {
      continue
    }
    // 步骤晚于目标版本：不执行（防止步骤表里写入未来版本时被提前应用）
    if (compareLeftVersionLessThanRightVersions(toVersion, step.version)) {
      continue
    }
    step.apply(ctx)
    result.applied.push(step.version)
  }

  log(
    `Migration ${ctx.mode}: ${fromVersion} → ${toVersion}, applied [${result.applied.join(', ')}]`,
  )
  return result
}
