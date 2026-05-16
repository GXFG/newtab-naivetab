/** 最大层数，修改此值会同步影响默认配置、命令注册、迁移等位置 */
export const MAX_LAYERS = 4

/** 键盘书签数据来源 */
export enum BookmarkSource {
  /** 浏览器书签 */
  BROWSER = 1,
  /** 扩展内书签 */
  INTERNAL = 2,
}

/** 日历日期类型 */
export enum CalendarDayType {
  /** 普通日 */
  NORMAL = 0,
  /** 休息日 / 节假日 */
  REST = 1,
  /** 工作日（含调休） */
  WORK = 2,
}

/** 层子文件夹名称列表，如 ['layer1', 'layer2', 'layer3', 'layer4'] */
export const LAYER_FOLDER_NAMES = Array.from(
  { length: MAX_LAYERS },
  (_, i) => `layer${i + 1}`,
)

/** 单个书签层配置 */
export interface TLayerConfig {
  sourceFolderPath: string
}

export const WIDGET_CODE_LIST = [
  'news',
  'weather',
  'calendar',
  'yearProgress',
  'keyboardBookmark',
  'clockDigital',
  'clockAnalog',
  'clockFlip',
  'clockNeon',
  'date',
  'memo',
  'bookmarkFolder',
  'search',
  'countdown',
] as const

export type WidgetCodes = (typeof WIDGET_CODE_LIST)[number]

/**
 * Widget config type → 具体类型的映射。
 * 使用动态 import() 语法指向 UI 层的各 widget config。
 * 新增 Widget 时在此追加一行。
 */
export type WidgetConfigByCode = {
  keyboardBookmark: import('@/newtab/widgets/keyboardBookmark/config').TWidgetConfig
  bookmarkFolder: import('@/newtab/widgets/bookmarkFolder/config').TWidgetConfig
  calendar: import('@/newtab/widgets/calendar/config').TWidgetConfig
  search: import('@/newtab/widgets/search/config').TWidgetConfig
  news: import('@/newtab/widgets/news/config').TWidgetConfig
  memo: import('@/newtab/widgets/memo/config').TWidgetConfig
  date: import('@/newtab/widgets/date/config').TWidgetConfig
  clockDigital: import('@/newtab/widgets/clockDigital/config').TWidgetConfig
  clockAnalog: import('@/newtab/widgets/clockAnalog/config').TWidgetConfig
  clockFlip: import('@/newtab/widgets/clockFlip/config').TWidgetConfig
  clockNeon: import('@/newtab/widgets/clockNeon/config').TWidgetConfig
  weather: import('@/newtab/widgets/weather/config').TWidgetConfig
  yearProgress: import('@/newtab/widgets/yearProgress/config').TWidgetConfig
  countdown: import('@/newtab/widgets/countdown/config').TWidgetConfig
}

/**
 * 将 widget code 映射到对应的 setting pane code。
 * 未在此映射中的 widget，默认使用自身的 code 作为 pane code。
 */
export type TWidgetSettingPaneMap = Partial<Record<WidgetCodes, settingPanes>>

export const WIDGET_SETTING_PANE_MAP: TWidgetSettingPaneMap = {
  clockDigital: 'clockDate',
  clockAnalog: 'clockDate',
  clockFlip: 'clockDate',
  clockNeon: 'clockDate',
  date: 'clockDate',
}

export const getWidgetSetting = (code: WidgetCodes): settingPanes => {
  return WIDGET_SETTING_PANE_MAP[code] ?? (code as settingPanes)
}

/**
 * Widget 分组定义，用于 DraftDrawer 和 FocusSetting 的分类展示。
 */
export const WIDGET_GROUPS: Array<{
  labelKey: string
  codes: WidgetCodes[]
}> = [
  {
    labelKey: 'widgetGroup.timeAndDate',
    codes: [
      'clockDigital',
      'clockAnalog',
      'clockFlip',
      'clockNeon',
      'date',
      'calendar',
      'yearProgress',
      'countdown',
    ],
  },
  {
    labelKey: 'widgetGroup.bookmark',
    codes: ['keyboardBookmark', 'bookmarkFolder'],
  },
  {
    labelKey: 'widgetGroup.tool',
    codes: ['search', 'memo', 'weather', 'news'],
  },
]
