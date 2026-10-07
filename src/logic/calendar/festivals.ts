/**
 * 通用现代节日表
 *
 * tyme4ts 内置的是国家级与传统节日（元旦、国庆、春节、中秋…），不含情人节、母亲节
 * 这类现代节日。此处用库的 Event 规则声明式补齐，全部由 EventBuilder 表达：
 *   solarDay(月, 日, 偏移天数)          固定公历日
 *   solarWeek(月, 第几个, 星期几)       某月第 N 个星期几（-1 表示最后一个）
 *
 * 本表对所有节假日地区生效；某个地区不适用的条目由该地区数据文件的 exclude 排除
 * （见 ./regions/README.md）。
 *
 * 不使用库的 EventManager：它是全局可变注册表，且每次查询都会重新解析整张表。
 * Event 对象本身是自包含的（getSolarDay(year)），按年解析一次即可。
 *
 * 本表不设起始年份：日历的年份范围是 2000–2100，表内节日的实际起始年均早于该范围。
 */
import { Event } from 'tyme4ts'

/** 本地节日 */
export interface ILocalFestival {
  /** 展示名称 */
  name: string
  /** 日期规则 */
  event: Event
}

/** 库中星期索引：0=日 1=一 … 6=六 */
const SUNDAY = 0
const MONDAY = 1
const THURSDAY = 4
const SATURDAY = 6

/** 节日表（顺序即同日多节日时的展示顺序） */
export const LOCAL_FESTIVALS: ILocalFestival[] = [
  { name: '情人节', event: Event.builder().solarDay(2, 14, 0).build() },
  { name: '消费者权益日', event: Event.builder().solarDay(3, 15, 0).build() },
  {
    name: '全国中小学生安全教育日',
    event: Event.builder().solarWeek(3, -1, MONDAY).build(),
  },
  { name: '愚人节', event: Event.builder().solarDay(4, 1, 0).build() },
  { name: '母亲节', event: Event.builder().solarWeek(5, 2, SUNDAY).build() },
  {
    name: '全国助残日',
    event: Event.builder().solarWeek(5, 3, SUNDAY).build(),
  },
  { name: '父亲节', event: Event.builder().solarWeek(6, 3, SUNDAY).build() },
  {
    name: '全民国防教育日',
    event: Event.builder().solarWeek(9, 3, SATURDAY).build(),
  },
  {
    name: '世界住房日',
    event: Event.builder().solarWeek(10, 1, MONDAY).build(),
  },
  { name: '万圣节前夜', event: Event.builder().solarDay(10, 31, 0).build() },
  { name: '万圣节', event: Event.builder().solarDay(11, 1, 0).build() },
  { name: '感恩节', event: Event.builder().solarWeek(11, 4, THURSDAY).build() },
  { name: '平安夜', event: Event.builder().solarDay(12, 24, 0).build() },
  { name: '圣诞节', event: Event.builder().solarDay(12, 25, 0).build() },
]

/** 'YYYY-MM-DD' 形式的日期键 */
const dateKey = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/** 按年缓存：日期键 → 节日名列表 */
const yearCache = new Map<number, Map<string, string[]>>()

/** 取某公历年的节日日期表（首次访问时解析，之后走缓存） */
const getYearMap = (year: number): Map<string, string[]> => {
  const cached = yearCache.get(year)
  if (cached) return cached

  const map = new Map<string, string[]>()
  for (const { name, event } of LOCAL_FESTIVALS) {
    const day = event.getSolarDay(year)
    if (!day) continue
    const key = dateKey(day.getYear(), day.getMonth(), day.getDay())
    const names = map.get(key)
    if (names) names.push(name)
    else map.set(key, [name])
  }

  yearCache.set(year, map)
  return map
}

/** 取某天的本地节日名列表，无则返回空数组 */
export const getLocalFestivalNames = (
  year: number,
  month: number,
  day: number,
): string[] => getYearMap(year).get(dateKey(year, month, day)) ?? []
