/**
 * @module calendar/regions
 * @description 节假日地区注册表：把“地区”映射到该地区的节日增减与逐年休班数据。
 *
 * 地区代码遵循 ISO 3166-1 alpha-2（国际标准，唯一且不复用）。
 * CN 没有数据文件：节日与法定假日都直接使用 tyme4ts 内置数据；
 * 只有当库的数据缺失或需要修正时，才为 CN 补一份 cn.json（文件优先于库）。
 *
 * 本模块只依赖 tyme4ts 与地区 JSON，不引用任何上层模块。
 * @see ./README.md（地区代码表、数据格式、更新流程）
 * @see docs/widgets/calendar-widget.md#地区数据
 */
import hkJson from './hk.json'
import noneJson from './none.json'
import twJson from './tw.json'
import { resolveFestivalRules, toDateKey } from './rules'
import type { IRegionData, TRegionHolidayStatus } from './types'

/** JSON 导入不携带类型信息，此处收敛为 IRegionData；结构由 scripts/check/validate-holidays.ts 校验 */
const tw = twJson as IRegionData
const hk = hkJson as IRegionData
const none = noneJson as IRegionData

/** 缺该年数据时的回退策略 */
export type TRegionFallback =
  /** 使用 tyme4ts 内置法定假日数据（目前仅 CN） */
  | 'library'
  /** 不显示休班标记（宁可缺失，不可猜错） */
  | 'none'

/** 单个地区的注册项 */
export interface IRegionEntry {
  /** 设置面板下拉项文案 */
  labelKey: string
  /** 假期口径说明文案 */
  noteKey: string
  fallback: TRegionFallback
  /** 地区数据；CN 无数据文件 */
  data?: IRegionData
}

/**
 * 节假日地区注册表
 *
 * 地区代码遵循 ISO 3166-1 alpha-2；REGION_CODES 的顺序即设置面板下拉框顺序。
 * NONE 不是地区，而是「不显示任何地区节假日」的关闭态，让非中文地区用户也能关掉
 * 大陆口径的节日（保留元旦、劳动节等国际通用节日与通用现代节日表）。
 * 新增地区：在 REGION_CODES 与 HOLIDAY_REGIONS 各加一行，并补一份地区数据文件。
 */
export const REGION_CODES = ['NONE', 'CN', 'HK', 'TW'] as const

export type TRegionCode = (typeof REGION_CODES)[number]

/** 每个地区都必须有条目（Record 保证不会漏） */
export const HOLIDAY_REGIONS: Record<TRegionCode, IRegionEntry> = {
  NONE: {
    labelKey: 'calendar.region.none',
    noteKey: 'calendar.region.noneNote',
    fallback: 'none',
    data: none,
  },
  CN: {
    labelKey: 'calendar.region.cn',
    noteKey: 'calendar.region.cnNote',
    fallback: 'library',
  },
  HK: {
    labelKey: 'calendar.region.hk',
    noteKey: 'calendar.region.hkNote',
    fallback: 'none',
    data: hk,
  },
  TW: {
    labelKey: 'calendar.region.tw',
    noteKey: 'calendar.region.twNote',
    fallback: 'none',
    data: tw,
  },
}

/** 默认地区，保持与历史行为一致 */
export const DEFAULT_REGION: TRegionCode = 'CN'

/** 运行时校验地区代码：配置可能来自更高版本的设备（云同步），不能只依赖类型 */
export const isRegionCode = (value: string): value is TRegionCode =>
  Object.prototype.hasOwnProperty.call(HOLIDAY_REGIONS, value)

/**
 * 把任意字符串收敛为已注册的地区代码，非法值回退到默认地区。
 * 调用方（Widget、设置面板）在把配置值传给适配层或注册表前都要经过它：
 * 配置可能来自安装了更高版本的设备（云同步），运行时不保证是当前版本认识的地区。
 */
export const resolveRegionCode = (value: string): TRegionCode =>
  isRegionCode(value) ? value : DEFAULT_REGION

/**
 * 取地区注册项。
 * 所有访问器都经由此函数，非法代码统一回退到默认地区，避免上下游各写一遍防御。
 */
export const getRegionEntry = (region: TRegionCode): IRegionEntry =>
  HOLIDAY_REGIONS[resolveRegionCode(region)]

export const getRegionFallback = (region: TRegionCode): TRegionFallback =>
  getRegionEntry(region).fallback

/** 需要排除的节日名缓存：region → 名称集合 */
const excludeCache = new Map<TRegionCode, ReadonlySet<string>>()

/** 该地区需要排除的节日名（既包括 tyme 内置节日，也包括通用现代节日表） */
export const getRegionExcludeSet = (
  region: TRegionCode,
): ReadonlySet<string> => {
  const code = resolveRegionCode(region)
  const cached = excludeCache.get(code)
  if (cached) return cached

  const set = new Set(getRegionEntry(code).data?.exclude ?? [])
  excludeCache.set(code, set)
  return set
}

/** 年度地区节日表缓存：region → year → (日期键 → 节日名) */
const festivalCache = new Map<TRegionCode, Map<number, Map<string, string[]>>>()

const getRegionFestivalYearMap = (
  region: TRegionCode,
  year: number,
): Map<string, string[]> => {
  const code = resolveRegionCode(region)
  let byYear = festivalCache.get(code)
  if (!byYear) {
    byYear = new Map()
    festivalCache.set(code, byYear)
  }

  const cached = byYear.get(year)
  if (cached) return cached

  const map = resolveFestivalRules(getRegionEntry(code).data?.add ?? [], year)
  byYear.set(year, map)
  return map
}

/** 取某天的地区节日名，无则返回空数组 */
export const getRegionFestivalNames = (
  region: TRegionCode,
  year: number,
  month: number,
  day: number,
): string[] =>
  getRegionFestivalYearMap(region, year).get(toDateKey(year, month, day)) ?? []

/** 年度休班表缓存：region → year → (日期键 → 状态)，null 表示该年没有数据 */
const holidayCache = new Map<
  TRegionCode,
  Map<number, Map<string, TRegionHolidayStatus> | null>
>()

/**
 * 取某地区某年的休班标记
 * @returns 该年无数据时返回 null（调用方据此决定回退还是显示为空）
 */
export const getRegionHolidayMap = (
  region: TRegionCode,
  year: number,
): Map<string, TRegionHolidayStatus> | null => {
  const code = resolveRegionCode(region)
  let byYear = holidayCache.get(code)
  if (!byYear) {
    byYear = new Map()
    holidayCache.set(code, byYear)
  }

  if (byYear.has(year)) return byYear.get(year) ?? null

  const yearData = getRegionEntry(code).data?.years?.[String(year)]
  let map: Map<string, TRegionHolidayStatus> | null = null
  if (yearData) {
    map = new Map()
    for (const restDay of yearData.rest) map.set(restDay.date, 'REST')
    for (const workDay of yearData.work) map.set(workDay, 'WORK')
  }

  byYear.set(year, map)
  return map
}
