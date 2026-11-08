/**
 * 通用现代节日表（国际通用的 9 个）
 *
 * 节假日订阅（./subscriptions）提供的是「某个地区认定的节日与休班」，
 * 但 Apple 的中国大陆日历不含情人节、母亲节、圣诞这类西方节日，
 * 所以这里用规则声明式补一张与地区无关的表，全部由 EventBuilder 表达：
 *   solarDay(月, 日, 偏移天数)          固定公历日
 *   solarWeek(月, 第几个, 星期几)       某月第 N 个星期几（-1 表示最后一个）
 *
 * 只收国际通用条目：大陆特有的纪念日（安全教育日、助残日、国防教育日）已移除，
 * 避免美国等地区订阅的用户看到不属于自己的节日。世界住房日、万圣节前夜
 * 也按产品决定移除，因此这里只有 9 条；不要再按旧的 11 条补回来。
 *
 * 不使用库的 EventManager：它是全局可变注册表，且每次查询都会重新解析整张表。
 * Event 对象本身是自包含的（getSolarDay(year)），按年解析一次即可。
 *
 * 本表不设起始年份：日历的年份范围是 1900–2100（与订阅解析窗口一致），
 * 表内节日的实际起始年均早于该范围。
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
const THURSDAY = 4

/** 节日表（顺序即同日多节日时的展示顺序） */
export const LOCAL_FESTIVALS: ILocalFestival[] = [
  { name: '情人节', event: Event.builder().solarDay(2, 14, 0).build() },
  { name: '消费者权益日', event: Event.builder().solarDay(3, 15, 0).build() },
  { name: '愚人节', event: Event.builder().solarDay(4, 1, 0).build() },
  { name: '母亲节', event: Event.builder().solarWeek(5, 2, SUNDAY).build() },
  { name: '父亲节', event: Event.builder().solarWeek(6, 3, SUNDAY).build() },
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
