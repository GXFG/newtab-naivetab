import type { Component } from 'vue'
import { SETTING_ICON_META } from '@/logic/constants/icons'

// 静态导入所有设置面板组件
// 浏览器扩展中文件都在本地磁盘，动态 import() 的网络优化在此场景下无收益，
// 反而增加首次访问微延迟、错误处理复杂度、defineAsyncComponent 维护成本。
import GeneralPane from './panes/general/index.vue'
import FocusModePane from './panes/focusMode/index.vue'
import KeyboardCommonPane from './panes/keyboardCommon/index.vue'
import KeyboardCommandPane from './panes/keyboardCommand/index.vue'
import KeyboardBookmarkPane from './panes/keyboardBookmark/index.vue'
import BookmarkFolderPane from './panes/bookmarkFolder/index.vue'
import ClockDatePane from './panes/clockDate/index.vue'
import CalendarPane from './panes/calendar/index.vue'
import YearProgressPane from './panes/yearProgress/index.vue'
import CountdownPane from './panes/countdown/index.vue'
import SearchPane from './panes/search/index.vue'
import MemoPane from './panes/memo/index.vue'
import WeatherPane from './panes/weather/index.vue'
import NewsPane from './panes/news/index.vue'
import AboutSponsorPane from './panes/aboutSponsor/index.vue'
import AboutIndexPane from './panes/aboutIndex/index.vue'

/**
 * 设置面板元数据
 */
export type SettingMeta = {
  component: Component
  code: settingPanes
  iconName: string
  iconSize: number
  labelKey?: string
}

/**
 * 设置面板配置项
 */
type SettingItem = {
  code: settingPanes
  labelKey: string
}

/**
 * 设置面板分组
 * - labelKey: 分组标题多语言key（会显示在分割线位置）
 * - items: 分组下的设置面板
 */
type SettingGroup = {
  labelKey: string
  items: SettingItem[]
}

// @@@@ add widget setting  registry
/**
 * 设置面板配置（按分组组织，集中管理）
 * 分组结构与 WIDGET_GROUPS 完全一致
 */
export const SETTING_GROUPS: SettingGroup[] = [
  {
    labelKey: 'widgetGroup.global',
    items: [
      { code: 'general', labelKey: 'setting.general' },
      { code: 'focusMode', labelKey: 'setting.focusMode' },
    ],
  },
  {
    labelKey: 'widgetGroup.keyboardAndBookmark',
    items: [
      { code: 'keyboardCommon', labelKey: 'setting.keyboardCommon' },
      { code: 'keyboardCommand', labelKey: 'setting.keyboardCommand' },
      { code: 'keyboardBookmark', labelKey: 'setting.keyboardBookmark' },
      { code: 'bookmarkFolder', labelKey: 'setting.bookmarkFolder' },
    ],
  },
  {
    labelKey: 'widgetGroup.timeAndDate',
    items: [
      { code: 'clockDate', labelKey: 'setting.clockDate' },
      { code: 'calendar', labelKey: 'setting.calendar' },
      { code: 'yearProgress', labelKey: 'setting.yearProgress' },
      { code: 'countdown', labelKey: 'setting.countdown' },
    ],
  },
  {
    labelKey: 'widgetGroup.tool',
    items: [
      { code: 'search', labelKey: 'setting.search' },
      { code: 'memo', labelKey: 'setting.memo' },
      { code: 'weather', labelKey: 'setting.weather' },
      { code: 'news', labelKey: 'setting.news' },
    ],
  },
  {
    labelKey: 'widgetGroup.other',
    items: [
      { code: 'aboutSponsor', labelKey: 'setting.aboutSponsor' },
      { code: 'aboutIndex', labelKey: 'setting.aboutIndex' },
    ],
  },
]

const SETTING_ORDER: settingPanes[] = SETTING_GROUPS.flatMap((g) =>
  g.items.map((i) => i.code),
)

/**
 * 面板组件映射表
 * 类型安全：key 为 settingPanes 联合类型，TS 编译时强制所有 pane 都必须有对应组件。
 * 新增 panel 时若遗漏注册，TS 会在编译期报错。
 */
const PANE_MAP: Record<settingPanes, Component> = {
  general: GeneralPane,
  focusMode: FocusModePane,
  keyboardCommon: KeyboardCommonPane,
  keyboardCommand: KeyboardCommandPane,
  keyboardBookmark: KeyboardBookmarkPane,
  bookmarkFolder: BookmarkFolderPane,
  clockDate: ClockDatePane,
  calendar: CalendarPane,
  yearProgress: YearProgressPane,
  countdown: CountdownPane,
  search: SearchPane,
  memo: MemoPane,
  weather: WeatherPane,
  news: NewsPane,
  aboutSponsor: AboutSponsorPane,
  aboutIndex: AboutIndexPane,
}

// 创建设置面板元数据
// 类型安全说明：SETTING_ICON_META 类型为 Record<settingPanes, ...>，
// TypeScript 编译时强制要求所有 settingPanes 值都必须有对应图标元数据。
// 新增 panel 时若遗漏注册，TS 会在编译期报错，不会等到运行时空指针。
const createSettingMeta = (item: SettingItem): SettingMeta => {
  const { code, labelKey } = item
  const iconMeta = SETTING_ICON_META[code]
  return {
    code,
    iconName: iconMeta.iconName,
    iconSize: iconMeta.settingSize,
    labelKey,
    component: PANE_MAP[code],
  }
}

const registry = new Map<settingPanes, SettingMeta>()

for (const group of SETTING_GROUPS) {
  for (const item of group.items) {
    registry.set(item.code, createSettingMeta(item))
  }
}

export const settingsList = SETTING_ORDER.map((code) =>
  registry.get(code),
).filter(Boolean) as SettingMeta[]
