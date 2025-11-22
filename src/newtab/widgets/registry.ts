import type { DefineComponent } from 'vue'
import { WIDGET_CODE_LIST } from './codes'
import type { TWidgetConfig as KeyboardConfig } from './keyboard/config'
import type { TWidgetConfig as CalendarConfig } from './calendar/config'
import type { TWidgetConfig as SearchConfig } from './search/config'
import type { TWidgetConfig as NewsConfig } from './news/config'
import type { TWidgetConfig as MemoConfig } from './memo/config'
import type { TWidgetConfig as DateConfig } from './date/config'
import type { TWidgetConfig as ClockDigitalConfig } from './clockDigital/config'
import type { TWidgetConfig as ClockAnalogConfig } from './clockAnalog/config'
import type { TWidgetConfig as WeatherConfig } from './weather/config'
import type { TWidgetConfig as YearProgressConfig } from './yearProgress/config'

// @@@@ add widget registry
export type WidgetConfigByCode = {
  keyboard: KeyboardConfig
  calendar: CalendarConfig
  search: SearchConfig
  news: NewsConfig
  memo: MemoConfig
  date: DateConfig
  clockDigital: ClockDigitalConfig
  clockAnalog: ClockAnalogConfig
  weather: WeatherConfig
  yearProgress: YearProgressConfig
}

export type WidgetMeta = {
  component: DefineComponent
  code: WidgetCodes
  config: WidgetConfigByCode[WidgetCodes]
  iconName: string
  iconSize: number
  widgetLabel: string // i18n key
}

const modules = import.meta.glob('./**/index.ts', { eager: true }) as Record<string, { default: WidgetMeta }>

const registry: Record<WidgetCodes, WidgetMeta> = {} as any

for (const path in modules) {
  const meta = modules[path].default
  registry[meta.code] = meta
}

export const widgetsRegistry = registry
export const widgetsList = WIDGET_CODE_LIST.map((widgetCode) => registry[widgetCode])
