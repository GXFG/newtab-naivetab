/**
 * @module calendar/regions/rules
 * @description 地区节日规则的解析：把 regions/*.json 里的声明式规则转成 tyme4ts 的 Event，
 *   并按公历年解析成日期表。
 *
 * 本模块只依赖 tyme4ts，不引用任何上层模块，因此可以被校验脚本直接加载。
 */
import { Event, SolarTerm } from 'tyme4ts'
import type { IRegionFestival, TRegionWeek } from './types'

/** 星期几 → tyme4ts 的 Week 索引（0=日 … 6=六） */
const WEEK_INDEX: Record<TRegionWeek, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

/** 节气名 → 索引（0=冬至 … 23=大雪），名称非法时库会抛错 */
const termIndexCache = new Map<string, number>()
const getTermIndex = (name: string): number => {
  const cached = termIndexCache.get(name)
  if (cached !== undefined) return cached

  const index = SolarTerm.fromName(2000, name).getIndex()
  termIndexCache.set(name, index)
  return index
}

/** 'YYYY-MM-DD' 日期键 */
export const toDateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/**
 * 把一条节日规则转成 tyme4ts 的 Event
 * @throws 规则非法时抛出（由校验脚本捕获并报告）
 */
export const buildFestivalEvent = (festival: IRegionFestival): Event => {
  const { rule } = festival

  switch (rule.type) {
    case 'solarDay':
      return Event.builder()
        .solarDay(rule.month, rule.day, rule.offset ?? 0)
        .build()
    case 'solarWeek':
      return Event.builder()
        .solarWeek(rule.month, rule.index, WEEK_INDEX[rule.week])
        .build()
    case 'lunarDay':
      return Event.builder()
        .lunarDay(rule.month, rule.day, rule.offset ?? 0)
        .build()
    case 'termDay':
      return Event.builder()
        .termDay(getTermIndex(rule.term), rule.offset ?? 0)
        .build()
    default:
      // 数据来自 JSON，运行时可能是未知类型；由校验脚本负责提前拦住
      throw new Error(`未知的节日规则类型：${JSON.stringify(rule)}`)
  }
}

/** 把一组节日规则解析为某公历年的日期表：日期键 → 节日名列表（按声明顺序） */
export const resolveFestivalRules = (
  festivals: IRegionFestival[],
  year: number,
): Map<string, string[]> => {
  const map = new Map<string, string[]>()

  for (const festival of festivals) {
    const day = buildFestivalEvent(festival).getSolarDay(year)
    if (!day) continue

    const key = toDateKey(day.getYear(), day.getMonth(), day.getDay())
    const names = map.get(key)
    if (names) names.push(festival.name)
    else map.set(key, [festival.name])
  }

  return map
}
