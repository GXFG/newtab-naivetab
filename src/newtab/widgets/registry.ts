import type { DefineComponent } from 'vue'
import { WIDGET_CODE_LIST } from './codes'

// 类型定义：Widget code → config 类型的映射。
// 使用动态 import() 语法，无需单独的 import 语句。
// 新增 Widget 时只需在此追加一行。
export type WidgetConfigByCode = {
  keyboardBookmark: import('./keyboardBookmark/config').TWidgetConfig
  bookmarkFolder: import('./bookmarkFolder/config').TWidgetConfig
  calendar: import('./calendar/config').TWidgetConfig
  search: import('./search/config').TWidgetConfig
  news: import('./news/config').TWidgetConfig
  memo: import('./memo/config').TWidgetConfig
  date: import('./date/config').TWidgetConfig
  clockDigital: import('./clockDigital/config').TWidgetConfig
  clockAnalog: import('./clockAnalog/config').TWidgetConfig
  clockFlip: import('./clockFlip/config').TWidgetConfig
  clockNeon: import('./clockNeon/config').TWidgetConfig
  weather: import('./weather/config').TWidgetConfig
  yearProgress: import('./yearProgress/config').TWidgetConfig
  countdown: import('./countdown/config').TWidgetConfig
}

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
