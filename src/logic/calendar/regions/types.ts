/**
 * @module calendar/regions/types
 * @description 节假日地区数据文件（regions/*.json）的类型定义。
 * @see docs/widgets/calendar-widget.md#地区数据
 */

/** 节日规则里的星期几 */
export type TRegionWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

/**
 * 节日规则的声明式写法，与 tyme4ts 的 EventBuilder 一一对应：
 * - solarDay  固定公历日        （solarDay(month, day, offset)）
 * - solarWeek 某月第 N 个星期几  （solarWeek(month, index, week)，index 为 -1 表示最后一个）
 * - lunarDay  农历日            （lunarDay(month, day, offset)）
 * - termDay   节气及其偏移       （termDay(term, offset)）
 *
 * 数据文件里用可读写法（"week": "sun"、"term": "清明"），由 ./rules 负责映射到库的内部索引。
 */
export type TRegionFestivalRule =
  | { type: 'solarDay'; month: number; day: number; offset?: number }
  | { type: 'solarWeek'; month: number; index: number; week: TRegionWeek }
  | { type: 'lunarDay'; month: number; day: number; offset?: number }
  | { type: 'termDay'; term: string; offset?: number }

/** 地区独有节日 */
export interface IRegionFestival {
  /** 展示名称 */
  name: string
  /** 日期规则 */
  rule: TRegionFestivalRule
}

/** 休息日 */
export interface IRegionRestDay {
  /** YYYY-MM-DD */
  date: string
  /** 假期名称，便于核对「这天为什么休」 */
  name?: string
}

/** 某公历年的节假日安排 */
export interface IRegionHolidayYear {
  /** 数据来源（公告名称） */
  source: string
  /** 来源链接 */
  sourceUrl: string
  /** 人工核对日期 YYYY-MM-DD */
  verifiedAt: string
  /** 休息日 */
  rest: IRegionRestDay[]
  /** 补班日 */
  work: string[]
}

/** 一个地区的节假日数据文件 */
export interface IRegionData {
  /** ISO 3166-1 alpha-2 地区代码；`NONE` 为「不显示节假日」的关闭态（见 ./README.md） */
  region: string
  /** 假期口径，如 general-holidays */
  scheme: string
  /** 需要从 tyme4ts 内置节日表 / 通用现代节日表中排除的节日名 */
  exclude: string[]
  /** 该地区独有节日 */
  add: IRegionFestival[]
  /** 逐年休班安排，键为公历年 */
  years: Record<string, IRegionHolidayYear>
}

/** 某天的休班状态 */
export type TRegionHolidayStatus = 'REST' | 'WORK'
