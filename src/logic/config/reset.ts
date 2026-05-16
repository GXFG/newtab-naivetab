/**
 * Widget 配置重置 — 支持快速重置（保留用户数据）和完全重置。
 */
import { localConfig } from '@/logic/config/state'
import { defaultConfig } from '@/logic/config/defaults'

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

  // 删除不在默认值中且非保留的字段，避免 Object.assign 只覆盖不删除的问题
  const defaultKeys = new Set(Object.keys(defaultValue))
  const preserveKeysSet = new Set(preserved ? Object.keys(preserved) : [])
  for (const key of Object.keys(current)) {
    if (!defaultKeys.has(key) && !preserveKeysSet.has(key)) {
      delete current[key]
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
