/**
 * 日历数据适配层
 *
 * 职责：
 *   - 全项目唯一依赖日历库（tyme4ts）的模块，向上层输出与具体库无关的数据结构
 *   - **节日、节气、休班全部来自「节假日订阅」**（见 ./subscriptions）；tyme4ts 只负责
 *     农历日期与黄历（宜忌、吉神、凶煞、干支），不再提供节日表
 *
 * 约定：
 * 1. 全部为纯函数，不读写全局状态，可在任意执行上下文安全引用
 * 2. 入参 Date 一律按**本地时间**取值；调用方不要传 `new Date('YYYY-MM-DD')`
 *    （该写法按 UTC 解析，在东八区以西会整体错一天）
 * 3. 订阅数据未就绪时传 `subscription: null`，此时格子/详情只输出农历、黄历
 *    与通用现代节日（后者只在中国大陆订阅时开启）
 * 4. 展示开关（农历与节气、黄历详情）由 ICalendarOptions 传入 —— 文案优先级只有这一份实现，
 *    格子、详情、倒计时列表共用，避免三处各写一遍规则
 */
import { SolarDay, SolarTerm } from 'tyme4ts'
import { CalendarDayType } from '@/common/widget-constants'
import { getLocalFestivalNames } from './festivals'
import type { IIcsDayEntry } from './ics/parse'

/** 订阅数据：'YYYY-MM-DD' → 当天条目 */
export type TSubscriptionDayMap = Record<string, IIcsDayEntry>

/**
 * 繁体节气名（与简体不同的 5 个）。
 * 订阅 HK/TW 时源里的节气是「驚蟄 / 穀雨 / 小滿 / 芒種 / 處暑」，
 * 只认 tyme4ts 的简体名会让它们被当成普通节日，关掉「农历与节气」也隐藏不了。
 */
const TRADITIONAL_SOLAR_TERM_NAMES = [
  '驚蟄',
  '穀雨',
  '小滿',
  '芒種',
  '處暑',
] as const

/** 二十四节气名集合（简繁）：订阅里同时包含节气与节日，靠它区分 */
export const SOLAR_TERM_NAMES: ReadonlySet<string> = new Set([
  ...SolarTerm.NAMES,
  ...TRADITIONAL_SOLAR_TERM_NAMES,
])

/** 展示选项：数据（订阅）与展示（农历、黄历）正交 */
export interface ICalendarOptions {
  /** 订阅数据；null 表示尚未加载 */
  subscription: TSubscriptionDayMap | null
  /**
   * 是否补充通用节日表（festivals.ts）：
   * 那 9 条只有中文名称，只在订阅中文地区时开启，避免英文日历里夹中文节日
   */
  includeLocalFestivals: boolean
  /** 展示农历日期与节气：关闭后格子第二行、详情农历行、列表里的节气都不再出现 */
  showLunarTerm: boolean
  /** 展示黄历详情：关闭后宜、忌、吉神、凶煞都返回空数组 */
  showAlmanac: boolean
}

/**
 * 格子与倒计时列表的选项：黄历只出现在详情弹窗里，上不了格子，
 * 因此这里不收 showAlmanac —— 切换黄历开关也就不会触发格子与列表重算。
 */
export type TCalendarCellOptions = Pick<
  ICalendarOptions,
  'subscription' | 'includeLocalFestivals' | 'showLunarTerm'
>

/** 星座标识：顺序与 tyme4ts 的 Constellation.NAMES 一致（白羊 → 双鱼） */
export const CONSTELLATION_KEYS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const

export type TConstellationKey = (typeof CONSTELLATION_KEYS)[number]

/** 日期格子数据 */
export interface ICalendarDayCell {
  /**
   * 主文案：
   * 订阅节日 → 通用现代节日 → 订阅节气 → 农历月/日
   * 关闭「农历与节气」后，无节日时为空串
   */
  desc: string
  /** desc 是否来自节日/节气（false 表示回退成了农历日期） */
  isFestival: boolean
  /** 休 / 班 / 普通 */
  dayType: CalendarDayType
}

/** 日期详情数据 */
export interface ICalendarDayDetail {
  /** 星期，0=周日 … 6=周六（展示时映射到 i18n） */
  weekday: number
  /** 干支生肖年 + 农历月日；关闭农历后为空串 */
  lunar: string
  /** 当天节日，已按展示优先级排列 */
  festivals: string[]
  /** 星座标识，如 'gemini'（展示时映射到 i18n） */
  constellation: TConstellationKey
  /** 宜 */
  yi: string[]
  /** 忌 */
  ji: string[]
  /** 吉神宜趋 */
  jishen: string[]
  /** 凶煞宜忌 */
  xiongsha: string[]
}

/** 节日倒计时列表项 */
export interface ICalendarFestivalItem {
  /** 当天零点（本地时间） */
  date: Date
  /** 距列表起始日的天数，起始日当天为 0 */
  offsetDays: number
  /** 节日/节气文案 */
  desc: string
  /** 休 / 班 / 普通 */
  dayType: CalendarDayType
}

/** tyme 用 Luck 区分吉凶 */
const LUCK_GOOD = '吉'
const LUCK_BAD = '凶'

/** 取当天零点，排除时分秒对日期推算的干扰 */
const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

/** 本地时间日期 → 'YYYY-MM-DD' */
const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/** 本地时间日期 → tyme 公历日 */
const toSolarDay = (date: Date): SolarDay =>
  SolarDay.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())

const getSubscriptionEntry = (
  date: Date,
  subscription: TSubscriptionDayMap | null,
): IIcsDayEntry | undefined =>
  subscription ? subscription[toDateKey(date)] : undefined

/** 休班标记直接来自订阅 */
const getDayType = (entry: IIcsDayEntry | undefined): CalendarDayType => {
  if (entry?.mark === 'REST') return CalendarDayType.REST
  if (entry?.mark === 'WORK') return CalendarDayType.WORK
  return CalendarDayType.NORMAL
}

/**
 * 当天节日名，按展示优先级排列：
 * 订阅节日 → 通用现代节日（仅中文地区）→ 订阅节气（受「农历与节气」开关控制）
 *
 * `names` 与 `termNames` 在解析层已经分开，所以「清明（休）」这种与节气同名的假期
 * 即使关掉「农历与节气」也不会从 names 里消失。
 */
const getDayFestivals = (
  date: Date,
  entry: IIcsDayEntry | undefined,
  showLunarTerm: boolean,
  includeLocalFestivals: boolean,
): string[] => {
  const festivalNames = entry?.names ?? []
  const localNames = includeLocalFestivals
    ? getLocalFestivalNames(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      )
    : []
  const termNames = showLunarTerm ? (entry?.termNames ?? []) : []

  // Set 去重且保留优先级顺序：订阅节日与通用节日同日时只显示一次
  return [...new Set([...festivalNames, ...localNames, ...termNames])]
}

/**
 * 取日期格子的展示数据
 * @param date 本地时间日期
 * @param options 展示选项（订阅数据、农历与节气）
 */
export const getDayCell = (
  date: Date,
  options: TCalendarCellOptions,
): ICalendarDayCell => {
  const { subscription, includeLocalFestivals, showLunarTerm } = options
  const solarDay = toSolarDay(date)
  const lunarDay = solarDay.getLunarDay()
  const entry = getSubscriptionEntry(date, subscription)
  const festivals = getDayFestivals(
    date,
    entry,
    showLunarTerm,
    includeLocalFestivals,
  )

  let desc = festivals[0] ?? ''
  if (!desc && showLunarTerm) {
    desc =
      lunarDay.getDay() === 1
        ? lunarDay.getLunarMonth().getName()
        : lunarDay.getName()
  }

  return {
    desc,
    isFestival: Boolean(festivals.length),
    dayType: getDayType(entry),
  }
}

/**
 * 取日期详情数据
 * @param date 本地时间日期
 * @param options 展示选项（订阅数据、农历与节气、黄历详情）
 */
export const getDayDetail = (
  date: Date,
  options: ICalendarOptions,
): ICalendarDayDetail => {
  const { subscription, includeLocalFestivals, showLunarTerm, showAlmanac } =
    options
  const solarDay = toSolarDay(date)
  const lunarDay = solarDay.getLunarDay()
  const lunarMonth = lunarDay.getLunarMonth()
  const sixtyCycle = lunarMonth.getLunarYear().getSixtyCycle()
  const gods = showAlmanac ? lunarDay.getGods() : []
  const entry = getSubscriptionEntry(date, subscription)

  return {
    weekday: solarDay.getWeek().getIndex(),
    lunar: showLunarTerm
      ? `${sixtyCycle.getName()}${sixtyCycle.getEarthBranch().getZodiac().getName()}年 农历${lunarMonth.getName()}${lunarDay.getName()}`
      : '',
    festivals: getDayFestivals(
      date,
      entry,
      showLunarTerm,
      includeLocalFestivals,
    ),
    constellation:
      CONSTELLATION_KEYS[solarDay.getConstellation().getIndex()] ?? 'aries',
    yi: showAlmanac
      ? lunarDay.getRecommends().map((taboo) => taboo.getName())
      : [],
    ji: showAlmanac ? lunarDay.getAvoids().map((taboo) => taboo.getName()) : [],
    jishen: gods
      .filter((god) => god.getLuck().getName() === LUCK_GOOD)
      .map((god) => god.getName()),
    xiongsha: gods
      .filter((god) => god.getLuck().getName() === LUCK_BAD)
      .map((god) => god.getName()),
  }
}

/**
 * 取节日倒计时列表：从 startDate 起（含当天）向后 days 天内有节日/节气的日期
 *
 * 关闭「农历与节气」后，只有节气的日期不再进入列表（与格子、详情保持一致）。
 * @param startDate 起始日，本地时间
 * @param options 展示选项（订阅数据、农历与节气）
 * @param days 向后取的天数，默认 365
 */
export const getFestivalList = (
  startDate: Date,
  options: TCalendarCellOptions,
  days = 365,
): ICalendarFestivalItem[] => {
  const start = startOfDay(startDate)
  const list: ICalendarFestivalItem[] = []

  for (let offsetDays = 0; offsetDays <= days; offsetDays += 1) {
    const dateEle = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + offsetDays,
    )
    const cell = getDayCell(dateEle, options)
    if (!cell.isFestival) continue

    list.push({
      date: dateEle,
      offsetDays,
      desc: cell.desc,
      dayType: cell.dayType,
    })
  }

  return list
}
