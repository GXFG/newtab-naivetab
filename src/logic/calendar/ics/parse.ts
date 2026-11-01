/**
 * @module calendar/ics/parse
 * @description iCalendar（.ics）解析：把节假日订阅文件解析成「日期 → 当天条目」的映射。
 *
 * 只处理节假日日历会出现的子集，遇到不认识的内容一律忽略（宽容解析）；
 * 但涉及日期正确性的地方宁可丢弃也不猜测：
 *   - DTEND 是**排他**的（DTSTART 20231230 / DTEND 20240102 = 12/30、12/31、1/1 三天）
 *   - 多日假期展开成逐日，最多展开 maxRangeDays 天（超出部分忽略，防异常数据）
 *   - RRULE 只展开支持的子集（见 ./rrule.ts），不支持的当作没有重复规则
 *   - 真实节假日源里未出现 RRULE + DTEND 的组合；若出现，目前只展开 DTSTART 的重复日
 *
 * 休/班标记的三种来源（按优先级）：
 *   1. X-APPLE-SPECIAL-DAY: WORK-HOLIDAY / ALTERNATE-WORKDAY（Apple 的中国大陆日历）
 *   2. SUMMARY 末尾的「（休）」/「（班）」后缀
 *   3. 都没有 → 只当普通节日，不打标记
 *
 * 节气的识别（两步，避免“清明假期”被误判成节气）：
 *   1. 先扫描所有「没有休班标记、且 SUMMARY 在节气名集合里」的事件，记下它们的日期为节气日
 *   2. 再合并事件：节气日上的无标记事件进 termNames，其余（包括同名的多日假期）进 names
 *   HK/TW 的节气是繁体（驚蟄/穀雨），调用方传入的 termNames 需同时包含简繁两套名称。
 *
 * 已知限制：如果自定义源把一个「没有休班标记、且与节气同名」的普通节日放在节气日，
 * 它无法与节气事件区分，会被归入 termNames；Apple 的节假日源用 SPECIAL-DAY/事件区分，
 * 不会出现这种歧义。
 */
import { expandYearlyRrule, parseRrule } from './rrule'
import type { IRruleDate, IYearlyRrule } from './rrule'

/** 单日的休班标记 */
export type TIcsDayMark = 'REST' | 'WORK'

/** 解析后的单日条目 */
export interface IIcsDayEntry {
  /** 当天节日名（不含节气；已去参数、去「（休）」「（班）」后缀、已去重） */
  names: string[]
  /** 当天节气名（与节日分开存，便于「农历与节气」开关只过滤节气） */
  termNames: string[]
  /** 休 / 班；同一天同时出现时「班」优先 */
  mark?: TIcsDayMark
}

export interface IIcsParseOptions {
  /** 展开起始年（含） */
  fromYear: number
  /** 展开结束年（含） */
  toYear: number
  /** 节气名集合（建议同时包含简繁名称），用于识别节气条目 */
  termNames?: ReadonlySet<string>
  /** 单条多日假期最多展开多少天，默认 60 */
  maxRangeDays?: number
}

const DEFAULT_MAX_RANGE_DAYS = 60

/** 折叠行展开（RFC 5545：换行 + 空白表示续行）；顺带去掉 UTF-8 BOM */
const unfold = (text: string): string =>
  text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')

/**
 * 文本看起来像 iCalendar（校验自定义订阅时用）。
 * 只有 VCALENDAR、没有 VEVENT 的文件对节假日场景没有意义，按非日历处理；
 * `empty` 错误留给“有事件但全被解析窗口/非法日期过滤掉”的情况。
 */
export const looksLikeCalendar = (text: string): boolean => {
  const normalized = unfold(text)
  return (
    /^BEGIN:VCALENDAR/im.test(normalized) && /^BEGIN:VEVENT/im.test(normalized)
  )
}

/**
 * 扫描 ICS 里实际出现的年份范围（只看 DTSTART/DTEND）。
 * 订阅解析窗口用它取源里已有的年份，而不是固定“今年 ±N”。
 */
export const getCalendarYearRange = (
  text: string,
): { minYear: number; maxYear: number } | null => {
  const unfolded = unfold(text)
  let minYear = Number.POSITIVE_INFINITY
  let maxYear = Number.NEGATIVE_INFINITY

  for (const matched of unfolded.matchAll(
    /^(?:DTSTART|DTEND)(?:;[^:\n]*)?:(\d{4})/gim,
  )) {
    const year = Number(matched[1])
    if (!Number.isFinite(year)) continue
    minYear = Math.min(minYear, year)
    maxYear = Math.max(maxYear, year)
  }

  return Number.isFinite(minYear) ? { minYear, maxYear } : null
}

/** 解析 YYYYMMDD 或 YYYYMMDDTHHMMSS[Z]；日期不存在时返回 null */
const parseIcsDate = (value: string): IRruleDate | null => {
  const matched = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim())
  if (!matched) return null

  const year = Number(matched[1])
  const month = Number(matched[2])
  const day = Number(matched[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return { year, month, day }
}

/** 取某个字段的原始值（自动跳过参数部分，如 SUMMARY;LANGUAGE=zh_CN:） */
const getField = (block: string, name: string): string | null => {
  const matched = new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, 'im').exec(block)
  return matched ? matched[1].trim() : null
}

/** 反转义 iCalendar 文本 */
const unescapeText = (value: string): string =>
  value
    .replace(/\\[nN]/g, ' ')
    .replace(/\\([,;\\])/g, '$1')
    .trim()

/** 从 SUMMARY 末尾剥掉「（休）」「（班）」并返回标记 */
const extractSummaryMark = (
  summary: string,
): {
  name: string
  mark?: TIcsDayMark
} => {
  const rest = /[（(]\s*休\s*[）)]\s*$/
  const work = /[（(]\s*班\s*[）)]\s*$/

  if (work.test(summary))
    return { name: summary.replace(work, '').trim(), mark: 'WORK' }
  if (rest.test(summary))
    return { name: summary.replace(rest, '').trim(), mark: 'REST' }
  return { name: summary }
}

const SPECIAL_DAY_MARKS: Record<string, TIcsDayMark> = {
  'WORK-HOLIDAY': 'REST',
  'ALTERNATE-WORKDAY': 'WORK',
}

const pad = (value: number): string => String(value).padStart(2, '0')

const toKey = (date: IRruleDate): string =>
  `${date.year}-${pad(date.month)}-${pad(date.day)}`

/** 日期的加减天数（用 UTC 计算避免夏令时干扰） */
const addDays = (date: IRruleDate, days: number): IRruleDate => {
  const base = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  }
}

interface IRawEvent {
  start: IRruleDate
  end: IRruleDate | null
  summary: string
  rrule: string | null
  specialDay: string | null
}

/** 解析后的完整事件：SUMMARY 已拆分名称与休班标记，RRULE 已解析 */
interface IParsedEvent {
  start: IRruleDate
  end: IRruleDate | null
  summary: string
  specialDay: string | null
  name: string
  mark?: TIcsDayMark
  rrule: IYearlyRrule | null
}

const parseEventBlock = (block: string): IRawEvent | null => {
  const startValue = getField(block, 'DTSTART')
  if (!startValue) return null

  const start = parseIcsDate(startValue)
  if (!start) return null

  const endValue = getField(block, 'DTEND')
  const summaryValue = getField(block, 'SUMMARY')

  return {
    start,
    end: endValue ? parseIcsDate(endValue) : null,
    summary: summaryValue ? unescapeText(summaryValue) : '',
    rrule: getField(block, 'RRULE'),
    specialDay: getField(block, 'X-APPLE-SPECIAL-DAY'),
  }
}

/**
 * 展开一个事件占用的日期。
 * - 有 RRULE：按年度规则展开（此时忽略 DTEND，真实源未出现该组合）
 * - 无 RRULE：按 [start, end) 展开，DTEND 排他
 */
const expandEventDates = (
  event: IParsedEvent,
  fromYear: number,
  toYear: number,
  maxRangeDays: number,
): IRruleDate[] => {
  if (event.rrule) {
    return expandYearlyRrule(event.rrule, event.start, fromYear, toYear)
  }

  const dates: IRruleDate[] = []
  const rangeEnd = event.end ?? addDays(event.start, 1)
  let cursor = event.start
  for (let index = 0; index < maxRangeDays; index += 1) {
    const compare = cursor.year * 10000 + cursor.month * 100 + cursor.day
    const limit = rangeEnd.year * 10000 + rangeEnd.month * 100 + rangeEnd.day
    if (compare >= limit) break
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

/**
 * 解析 iCalendar 文本
 * @returns 日期键（YYYY-MM-DD）→ 当天条目；解析不出任何事件时返回空 Map
 */
export const parseCalendar = (
  text: string,
  options: IIcsParseOptions,
): Map<string, IIcsDayEntry> => {
  const {
    fromYear,
    toYear,
    termNames,
    maxRangeDays = DEFAULT_MAX_RANGE_DAYS,
  } = options
  const map = new Map<string, IIcsDayEntry>()

  const unfolded = unfold(text)
  const events: IParsedEvent[] = []
  for (const chunk of unfolded.split(/BEGIN:VEVENT/i).slice(1)) {
    const block = chunk.split(/END:VEVENT/i)[0]
    const raw = parseEventBlock(block)
    if (!raw) continue

    const { name, mark: summaryMark } = extractSummaryMark(raw.summary)
    const specialMark = raw.specialDay
      ? SPECIAL_DAY_MARKS[raw.specialDay.toUpperCase()]
      : undefined

    events.push({
      ...raw,
      name,
      mark: specialMark ?? summaryMark,
      rrule: raw.rrule ? parseRrule(raw.rrule) : null,
    })
  }

  /**
   * 先标记真正的节气日：无休班标记、且名称在节气名集合里的事件。
   * 不能直接按名称判断（CN 的「清明（休）」多日假期与节气「清明」同名）。
   */
  const termDayKeys = new Set<string>()
  if (termNames) {
    for (const event of events) {
      if (event.mark || !termNames.has(event.name)) continue
      for (const date of expandEventDates(
        event,
        fromYear,
        toYear,
        maxRangeDays,
      )) {
        if (date.year < fromYear || date.year > toYear) continue
        termDayKeys.add(toKey(date))
      }
    }
  }

  const addEntry = (
    date: IRruleDate,
    name: string,
    mark: TIcsDayMark | undefined,
    isTerm: boolean,
  ): void => {
    if (date.year < fromYear || date.year > toYear) return

    const key = toKey(date)
    let entry = map.get(key)
    if (!entry) {
      entry = { names: [], termNames: [] }
      map.set(key, entry)
    }

    if (name) {
      const bucket = isTerm ? entry.termNames : entry.names
      if (!bucket.includes(name)) bucket.push(name)
    }

    // 「班」优先：误标为休会造成缺勤，误标为班会让人多查一次官方公告
    if (mark === 'WORK') entry.mark = 'WORK'
    else if (mark === 'REST' && entry.mark !== 'WORK') entry.mark = 'REST'
  }

  for (const event of events) {
    const isTermName = Boolean(termNames?.has(event.name))
    for (const date of expandEventDates(
      event,
      fromYear,
      toYear,
      maxRangeDays,
    )) {
      const isTerm = isTermName && !event.mark && termDayKeys.has(toKey(date))
      addEntry(date, event.name, event.mark, isTerm)
    }
  }

  return map
}
