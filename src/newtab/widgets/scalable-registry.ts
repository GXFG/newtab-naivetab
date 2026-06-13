/**
 * @module scalable-registry
 * @description 聚合所有 Widget 的 SCALABLE_FIELDS 声明。
 * 使用 import.meta.glob 扫描各 Widget 的 config.ts，提取 SCALABLE_FIELDS 导出。
 * @dependencies 各 Widget 的 config.ts
 * @consumers WidgetWrap.vue（获取当前 widget 的可缩放字段列表）
 */
import type { WidgetCodes } from '@/common/widget-constants'

export type TScalableFieldDef = {
  /** 最小值（含） */
  min: number
  /** 最大值（含） */
  max: number
  /**
   * 字段所在的 config section。
   * 默认为 widgetCode 自身（即 localConfig[widgetCode]）。
   * keyboardBookmark 的尺寸字段在 keyboardCommon 下，需显式指定。
   */
  configSection?: string
}

export type TScalableFieldsMap = Record<string, TScalableFieldDef>

const modules = import.meta.glob('../../newtab/widgets/**/config.ts', {
  eager: true,
}) as Record<string, any>

export const SCALABLE_FIELD_REGISTRY: Partial<
  Record<WidgetCodes, TScalableFieldsMap>
> = {}

for (const path in modules) {
  const m = modules[path]
  if (m && m.WIDGET_CODE && m.SCALABLE_FIELDS) {
    const code = m.WIDGET_CODE as WidgetCodes
    SCALABLE_FIELD_REGISTRY[code] = m.SCALABLE_FIELDS as TScalableFieldsMap
  }
}
