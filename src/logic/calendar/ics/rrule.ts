/**
 * @module calendar/ics/rrule
 * @description ICS 的 RRULE 展开，只支持节假日日历实际用到的子集：
 *   FREQ=YEARLY + INTERVAL + COUNT + BYMONTH + BYDAY + BYMONTHDAY
 *
 * 典型用法（Apple 的日历里真实出现过的）：
 *   RRULE:FREQ=YEARLY;COUNT=5                                   每年同一天
 *   RRULE:FREQ=YEARLY;COUNT=5;BYDAY=-1MO;BYMONTH=5               5 月最后一个周一（阵亡将士纪念日）
 *   RRULE:FREQ=YEARLY;COUNT=5;BYDAY=4TH;BYMONTH=11               11 月第 4 个周四（感恩节）
 *   RRULE:FREQ=YEARLY;COUNT=5;BYMONTHDAY=15;BYMONTH=8            8 月 15 日（加拿大 Acadian Day）
 *
 * 超出子集的一律返回 null，由调用方当作"没有重复规则"处理（宁可少展开，不可猜错）。
 *
 * 注意：
 *   - COUNT 按 RFC 语义计**实际产生的日期数**；2 月 29 日、第 5 个星期几在部分年份不存在，
 *     这些年份不计数。
 *   - BYDAY 与 BYMONTHDAY 同时出现属于交集语义，未支持，直接返回 null。
 */

/** ICS 里的星期缩写，索引与 JS `getDay()` 一致（0 = 周日） */
export const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

/** 已解析的年度重复规则 */
export interface IYearlyRrule {
  /** 只有 YEARLY 会被解析 */
  freq: 'YEARLY'
  /** 每隔几年一次 */
  interval: number
  /** 总次数（含首次），按实际产生的日期数计；未指定表示无限 */
  count?: number
  /** 限定月份（1-12） */
  byMonth?: number
  /** 限定的“第几个星期几”，nth 为负表示倒数 */
  byDay?: { nth: number; weekday: number }
  /** 限定公历日（1-31），与 byDay 互斥 */
  byMonthDay?: number
}

/** 日期（月为 1-12） */
export interface IRruleDate {
  year: number
  month: number
  day: number
}

/**
 * 严格解析可选整数：
 * - 字段不存在 → ok，无值（调用方用默认值）
 * - 存在但不是纯整数 → invalid（整条规则放弃）
 */
const parseOptionalInt = (
  raw: string | undefined,
): { ok: true; value?: number } | { ok: false } => {
  if (raw === undefined) return { ok: true }
  if (!/^-?\d+$/.test(raw)) return { ok: false }
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) return { ok: false }
  return { ok: true, value }
}

/**
 * 解析 RRULE
 * @returns 超出支持子集时返回 null
 */
export const parseRrule = (value: string): IYearlyRrule | null => {
  const parts = new Map<string, string>()
  for (const segment of value.trim().split(';')) {
    const [key, rawValue] = segment.split('=')
    if (key && rawValue !== undefined) parts.set(key.toUpperCase(), rawValue)
  }

  if ((parts.get('FREQ') ?? '').toUpperCase() !== 'YEARLY') return null
  // 不支持的字段直接放弃，避免按错误的规则展开
  for (const key of parts.keys()) {
    if (
      ![
        'FREQ',
        'INTERVAL',
        'COUNT',
        'BYMONTH',
        'BYDAY',
        'BYMONTHDAY',
        'WKST',
      ].includes(key)
    ) {
      return null
    }
  }

  const intervalResult = parseOptionalInt(parts.get('INTERVAL'))
  if (!intervalResult.ok) return null
  const interval = intervalResult.value ?? 1
  if (interval < 1) return null

  const countResult = parseOptionalInt(parts.get('COUNT'))
  if (!countResult.ok) return null
  const count = countResult.value
  if (count !== undefined && count < 1) return null

  const byMonthResult = parseOptionalInt(parts.get('BYMONTH'))
  if (!byMonthResult.ok) return null
  const byMonth = byMonthResult.value
  if (byMonth !== undefined && (byMonth < 1 || byMonth > 12)) return null

  const byMonthDayResult = parseOptionalInt(parts.get('BYMONTHDAY'))
  if (!byMonthDayResult.ok) return null
  const byMonthDay = byMonthDayResult.value
  if (byMonthDay !== undefined && (byMonthDay < 1 || byMonthDay > 31))
    return null

  let byDay: IYearlyRrule['byDay']
  const rawByDay = parts.get('BYDAY')
  if (rawByDay) {
    const matched = /^(-?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/i.exec(
      rawByDay.trim(),
    )
    if (!matched) return null

    const weekday = WEEKDAY_CODES.indexOf(
      matched[2].toUpperCase() as (typeof WEEKDAY_CODES)[number],
    )
    if (weekday < 0) return null

    const nth = matched[1] ? Number(matched[1]) : 0
    if (nth === 0) return null // 不支持"每周几全部"
    byDay = { nth, weekday }
  }

  // 交集语义（某月第 n 个星期几 + 某日）不在支持范围
  if (byDay && byMonthDay !== undefined) return null

  return {
    freq: 'YEARLY',
    interval,
    count,
    byMonth,
    byDay,
    byMonthDay,
  }
}

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate()

/** 取某月第 nth 个星期几（nth 为负则从月末倒数），不存在返回 null */
export const getNthWeekdayOfMonth = (
  year: number,
  month: number,
  nth: number,
  weekday: number,
): number | null => {
  const total = daysInMonth(year, month)

  if (nth > 0) {
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7
    return day <= total ? day : null
  }

  const lastWeekday = new Date(year, month - 1, total).getDay()
  const day = total - ((lastWeekday - weekday + 7) % 7) + (nth + 1) * 7
  return day >= 1 ? day : null
}

/**
 * 把年度规则展开成具体日期（只展开 [fromYear, toYear] 区间内的）
 *
 * COUNT 计的是实际产生的日期数：2 月 29 日、不存在的第 5 个星期几会跳过且不计数，
 * 因此规则可能延伸到 startDate 之后第 count 年以外，直到产生 count 个日期或到达 toYear。
 *
 * @param rule 已解析的规则
 * @param startDate DTSTART 指向的日期
 */
export const expandYearlyRrule = (
  rule: IYearlyRrule,
  startDate: IRruleDate,
  fromYear: number,
  toYear: number,
): IRruleDate[] => {
  const results: IRruleDate[] = []
  let occurrences = 0

  for (let year = startDate.year; year <= toYear; year += rule.interval) {
    const month = rule.byMonth ?? startDate.month
    let day: number | null

    if (rule.byDay) {
      day = getNthWeekdayOfMonth(
        year,
        month,
        rule.byDay.nth,
        rule.byDay.weekday,
      )
    } else if (rule.byMonthDay !== undefined) {
      day = rule.byMonthDay <= daysInMonth(year, month) ? rule.byMonthDay : null
    } else {
      // 2 月 29 日这类日期在平年不存在，跳过而不是顺延
      day = startDate.day <= daysInMonth(year, month) ? startDate.day : null
    }

    if (day === null) continue

    occurrences += 1
    if (year >= fromYear) results.push({ year, month, day })
    if (rule.count !== undefined && occurrences >= rule.count) break
  }

  return results
}
