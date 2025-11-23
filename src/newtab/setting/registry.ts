import type { DefineComponent } from 'vue'

type SettingMeta = {
  component: DefineComponent
  code: settingPanes
  iconName: string
  iconSize: number
  labelKey?: string
  labelKeys?: string[]
}

const SETTING_ORDER: settingPanes[] = [
  'general',
  'focusMode',
  'keyboard',
  'bookmarkFolder',
  'clockDate',
  'calendar',
  'yearProgress',
  'search',
  'memo',
  'weather',
  'news',
  'aboutSponsor',
  'aboutIndex',
]

const modules = import.meta.glob('./**/index.ts', { eager: true }) as Record<string, { default: SettingMeta }>

const registry: Record<settingPanes, SettingMeta> = {} as any

for (const path in modules) {
  const meta = modules[path].default
  registry[meta.code] = meta
}

const settingsRegistry = registry
export const settingsList = SETTING_ORDER.map((code) => registry[code]).filter(Boolean)
