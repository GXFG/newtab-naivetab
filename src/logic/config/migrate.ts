/**
 * 配置字段迁移 — 将任意版本的旧配置数据标准化为最新格式
 *
 * 纯数据转换，不产生副作用。调用方负责将结果写入 localConfig / localState。
 *
 * 使用场景：
 * - importSetting：用户导入的 JSON 可能是任意历史版本
 * - handleAppUpdate v2.2.2：localStorage 中仍存有旧 key（c-keyboard, c-commandShortcut）
 */
import { KEYBOARD_COMMON_CONFIG } from '@/logic/keyboard/keyboard-config'

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

/**
 * normalizeLegacyConfig 的返回值
 */
export interface NormalizedConfig {
  /** 标准化后的配置对象 */
  config: Record<string, any>
  /** 从 general.isFocusMode 中提取的值（v2.2.2 起 isFocusMode 迁至 localState） */
  extractedIsFocusMode?: boolean
}

/**
 * 将旧版本配置数据标准化为当前格式
 *
 * 处理内容：
 * 1. 顶层 key 重命名
 * 2. keyboardBookmark 外观字段拆分到 keyboardCommon
 * 3. focusVisibleWidgetMap 内 key 重命名
 * 4. openPageFocusElement 值修正
 * 5. isFocusMode 从 general 提取
 */
export function normalizeLegacyConfig(
  raw: Record<string, any>,
): NormalizedConfig {
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

  // ── 5. isFocusMode 从 general 提取 ──
  let extractedIsFocusMode: boolean | undefined
  if (
    config.general &&
    typeof config.general === 'object' &&
    'isFocusMode' in config.general
  ) {
    extractedIsFocusMode = config.general.isFocusMode
    delete config.general.isFocusMode
  }

  return { config, extractedIsFocusMode }
}
