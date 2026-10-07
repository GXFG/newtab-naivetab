/**
 * 日历数据适配层
 *
 * 职责：全项目唯一依赖日历库（tyme4ts）的模块，向上层输出与具体库无关的数据结构，
 * 使 Widget 只关心展示。
 *
 * 约定：
 * 1. 全部为纯函数，不读写全局状态，可在任意执行上下文安全引用
 * 2. 入参 Date 一律按**本地时间**取值；调用方不要传 `new Date('YYYY-MM-DD')`
 *    （该写法按 UTC 解析，在东八区以西会整体错一天）
 * 3. 不使用 tyme4ts 的全局注册表 EventManager；需要补的节日见 ./festivals 与 ./regions
 * 4. 休班与节日按「地区」区分，地区代码遵循 ISO 3166-1 alpha-2，见 ./regions
 * 5. 展示开关（农历与节气、黄历详情）由 ICalendarOptions 传入 —— 文案优先级只有这一份实现，
 *    格子、详情、倒计时列表共用，避免三处各写一遍规则
 */
import { LegalHoliday, SolarDay } from 'tyme4ts'
import type { LunarDay } from 'tyme4ts'
import { CalendarDayType } from '@/common/widget-constants'
import { getLocalFestivalNames } from './festivals'
import {
  getRegionExcludeSet,
  getRegionFallback,
  getRegionFestivalNames,
  getRegionHolidayMap,
} from './regions'
import type { TRegionCode } from './regions'
import { toDateKey } from './regions/rules'

/** 展示选项：三个轴正交（地区 = 数据，后两个 = 展示） */
export interface ICalendarOptions {
  /** 节假日地区；NONE 表示不显示任何地区的节假日 */
  region: TRegionCode
  /** 展示农历日期与节气：关闭后格子第二行、详情农历行、倒计时列表里的节气都不再出现 */
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
  'region' | 'showLunarTerm'
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
   * 农历节日 → 阳历节日 → 通用现代节日 → 地区节日 → 当天节气 → 农历月/日
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
  /** 干支生肖年 + 农历月日，如「丙午马年 农历正月初一」；关闭农历后为空串 */
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

/** 本地时间日期 → tyme 公历日 */
const toSolarDay = (date: Date): SolarDay =>
  SolarDay.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())

/**
 * 法定节假日 → 休/班标记
 *
 * 优先级：地区数据文件 → tyme4ts 内置数据（仅 fallback 为 library 的地区）
 * → 不显示标记。宁可缺失，不可猜错。
 */
const getDayType = (date: Date, region: TRegionCode): CalendarDayType => {
  const year = date.getFullYear()
  const holidayMap = getRegionHolidayMap(region, year)
  if (holidayMap) {
    const status = holidayMap.get(
      toDateKey(year, date.getMonth() + 1, date.getDate()),
    )
    if (status === 'REST') return CalendarDayType.REST
    if (status === 'WORK') return CalendarDayType.WORK
    return CalendarDayType.NORMAL
  }

  if (getRegionFallback(region) === 'library') {
    const holiday = LegalHoliday.fromYmd(
      year,
      date.getMonth() + 1,
      date.getDate(),
    )
    if (!holiday) return CalendarDayType.NORMAL
    return holiday.isWork() ? CalendarDayType.WORK : CalendarDayType.REST
  }

  return CalendarDayType.NORMAL
}

/** 当天节日名，按展示优先级排列，并按地区排除不适用的节日 */
const getDayFestivals = (
  date: Date,
  solarDay: SolarDay,
  lunarDay: LunarDay,
  region: TRegionCode,
): string[] => {
  const lunarFestival = lunarDay.getFestival()
  const solarFestival = solarDay.getFestival()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const exclude = getRegionExcludeSet(region)

  return [
    ...(lunarFestival ? [lunarFestival.getName()] : []),
    ...(solarFestival ? [solarFestival.getName()] : []),
    ...getLocalFestivalNames(year, month, day),
    ...getRegionFestivalNames(region, year, month, day),
  ].filter((name) => !exclude.has(name))
}

/**
 * 当天节气名。
 * tyme 的 getTerm() 返回的是「当天所处的节气」（如 1 月 1 日返回「冬至」），
 * 只有 getTermDay().getDayIndex() === 0 才是真正的交节日。
 */
const getTermName = (solarDay: SolarDay): string => {
  const termDay = solarDay.getTermDay()
  return termDay.getDayIndex() === 0 ? termDay.getSolarTerm().getName() : ''
}

/**
 * 取日期格子的展示数据
 * @param date 本地时间日期
 * @param options 展示选项（地区、农历与节气）
 */
export const getDayCell = (
  date: Date,
  options: TCalendarCellOptions,
): ICalendarDayCell => {
  const { region, showLunarTerm } = options
  const solarDay = toSolarDay(date)
  const lunarDay = solarDay.getLunarDay()
  const festivals = getDayFestivals(date, solarDay, lunarDay, region)
  const term = showLunarTerm ? getTermName(solarDay) : ''

  let desc = festivals[0] ?? term
  if (!desc && showLunarTerm) {
    desc =
      lunarDay.getDay() === 1
        ? lunarDay.getLunarMonth().getName()
        : lunarDay.getName()
  }

  return {
    desc: desc ?? '',
    isFestival: Boolean(festivals.length || term),
    dayType: getDayType(date, region),
  }
}

/**
 * 取日期详情数据
 * @param date 本地时间日期
 * @param options 展示选项（地区、农历与节气、黄历详情）
 */
export const getDayDetail = (
  date: Date,
  options: ICalendarOptions,
): ICalendarDayDetail => {
  const { region, showLunarTerm, showAlmanac } = options
  const solarDay = toSolarDay(date)
  const lunarDay = solarDay.getLunarDay()
  const lunarMonth = lunarDay.getLunarMonth()
  const sixtyCycle = lunarMonth.getLunarYear().getSixtyCycle()
  const gods = showAlmanac ? lunarDay.getGods() : []

  return {
    weekday: solarDay.getWeek().getIndex(),
    lunar: showLunarTerm
      ? `${sixtyCycle.getName()}${sixtyCycle.getEarthBranch().getZodiac().getName()}年 农历${lunarMonth.getName()}${lunarDay.getName()}`
      : '',
    festivals: getDayFestivals(date, solarDay, lunarDay, region),
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
 * @param options 展示选项（地区、农历与节气）
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
