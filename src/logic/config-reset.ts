import { localConfig } from '@/logic/store'
import { defaultConfig } from '@/logic/config'
import {
  PRESERVE_FIELDS as COMMAND_PRESERVE_FIELDS,
  COMMAND_SHORTCUT_CODE,
} from '@/logic/globalShortcut/shortcut-command'
import { PRESERVE_FIELDS as KEYBOARD_COMMON_PRESERVE_FIELDS } from '@/logic/keyboard/keyboard-config'

/**
 * 自动发现各 Widget 的 PRESERVE_FIELDS，模块级别只计算一次。
 */
function buildPreserveFieldsMap(): Record<string, string[]> {
  const modules = import.meta.glob('../../newtab/widgets/**/config.ts', {
    eager: true,
  }) as Record<string, any>
  const map: Record<string, string[]> = {}
  for (const key in modules) {
    const m = modules[key]
    if (
      m &&
      m.WIDGET_CODE &&
      Array.isArray(m.PRESERVE_FIELDS) &&
      m.PRESERVE_FIELDS.length > 0
    ) {
      map[m.WIDGET_CODE] = m.PRESERVE_FIELDS
    }
  }
  if (COMMAND_PRESERVE_FIELDS.length > 0) {
    map[COMMAND_SHORTCUT_CODE] = COMMAND_PRESERVE_FIELDS
  }
  if (KEYBOARD_COMMON_PRESERVE_FIELDS.length > 0) {
    map['keyboardCommon'] = KEYBOARD_COMMON_PRESERVE_FIELDS
  }
  return map
}

const PRESERVE_FIELDS_MAP = buildPreserveFieldsMap()

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

/**
 * 重置单个 Widget 配置（保留指定字段）。
 * @param widgetCode - Widget 配置键名
 * @param mode - 'quick' 仅重置为默认值 | 'full' 完全重置
 */
export const resetWidgetConfig = (
  widgetCode: string,
  mode: 'quick' | 'full' = 'full',
) => {
  if (!(widgetCode in defaultConfig)) return

  const current = localConfig[widgetCode as keyof typeof defaultConfig] as any
  const defaultValue = deepClone(
    defaultConfig[widgetCode as keyof typeof defaultConfig],
  )

  const preserved: Record<string, any> = {}
  if (current.enabled !== undefined) preserved.enabled = current.enabled
  if (current.layout !== undefined) preserved.layout = deepClone(current.layout)

  if (mode === 'quick') {
    const preserveFields = PRESERVE_FIELDS_MAP[widgetCode]
    if (preserveFields) {
      preserveFields.forEach((field) => {
        if (current[field] !== undefined) {
          preserved[field] = deepClone(current[field])
        }
      })
    }
  }

  Object.assign(current, defaultValue, preserved)
}

export const hasWidgetConfig = (widgetCode: string): boolean => {
  return widgetCode in defaultConfig
}

export const hasPreserveFields = (widgetCode: string): boolean => {
  return !!PRESERVE_FIELDS_MAP[widgetCode]
}
