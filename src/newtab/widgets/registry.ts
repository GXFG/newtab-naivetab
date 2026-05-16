import { WIDGET_CODE_LIST } from '@/common/widget-constants'
import type { WidgetConfigByCode } from '@/common/widget-constants'

export { WIDGET_CODE_LIST } from '@/common/widget-constants'
export type { WidgetCodes } from '@/common/widget-constants'
export {
  WIDGET_SETTING_PANE_MAP,
  getWidgetSetting,
} from '@/common/widget-constants'
export { WIDGET_GROUPS } from '@/common/widget-constants'

// ─── 以下类型/逻辑仅 UI 层使用，保留在 registry.ts ───

import type { DefineComponent } from 'vue'

export type WidgetMeta = {
  component: DefineComponent
  code: WidgetCodes
  config: WidgetConfigByCode[WidgetCodes]
  iconName: string
  iconSize: number
  widgetLabel: string // i18n key
}

// 自动扫描所有 widget index.ts 元信息模块
const modules = import.meta.glob('./**/index.ts', { eager: true }) as Record<
  string,
  { default: WidgetMeta }
>

const registry: Record<WidgetCodes, WidgetMeta> = {} as any

for (const path in modules) {
  const meta = modules[path].default
  registry[meta.code] = meta
}

export const widgetsRegistry = registry
export const widgetsList = WIDGET_CODE_LIST.map(
  (widgetCode) => registry[widgetCode],
)
