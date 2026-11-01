import { describe, it, expect } from 'vitest'
import {
  getCalendarYearRange,
  looksLikeCalendar,
  parseCalendar,
} from '@/logic/calendar/ics/parse'
import {
  expandYearlyRrule,
  getNthWeekdayOfMonth,
  parseRrule,
} from '@/logic/calendar/ics/rrule'

/** 同时包含简体与繁体节气名，覆盖 CN / HK 两种源 */
const TERMS = new Set(['小寒', '大寒', '立春', '冬至', '清明', '驚蟄'])

/** 合成一份「像 Apple 中国大陆日历」的片段 */
const CN_ICS = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:中国大陆节假日
BEGIN:VEVENT
DTSTAMP;VALUE=DATE:19760401
DTSTART;VALUE=DATE:20221231
DTEND;VALUE=DATE:20230103
SUMMARY;LANGUAGE=zh_CN:元旦（休）
X-APPLE-SPECIAL-DAY:WORK-HOLIDAY
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20230121
DTEND;VALUE=DATE:20230128
SUMMARY;LANGUAGE=zh_CN:春节（休）
X-APPLE-SPECIAL-DAY:WORK-HOLIDAY
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20230128
SUMMARY;LANGUAGE=zh_CN:春节（班）
X-APPLE-SPECIAL-DAY:ALTERNATE-WORKDAY
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20230105
SUMMARY;LANGUAGE=zh_CN:小寒
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20230101
SUMMARY;LANGUAGE=zh_CN:元旦
RRULE:FREQ=YEARLY;COUNT=6
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260404
DTEND;VALUE=DATE:20260407
SUMMARY;LANGUAGE=zh_CN:清明（休）
X-APPLE-SPECIAL-DAY:WORK-HOLIDAY
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260405
SUMMARY;LANGUAGE=zh_CN:清明
END:VEVENT
END:VCALENDAR`

/** 合成一份「像 Apple 美国日历」的片段（法定假日用 BYDAY 规则） */
const US_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261126
SUMMARY;LANGUAGE=en:Thanksgiving Day
RRULE:FREQ=YEARLY;COUNT=5;BYDAY=4TH;BYMONTH=11
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260525
SUMMARY;LANGUAGE=en:Memorial Day
RRULE:FREQ=YEARLY;COUNT=5;BYDAY=-1MO;BYMONTH=5
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260214
SUMMARY;LANGUAGE=en:Valentine’s Day
RRULE:FREQ=YEARLY;COUNT=5;BYMONTH=2
END:VEVENT
END:VCALENDAR`

describe('looksLikeCalendar', () => {
  it('识别 iCalendar 文本', () => {
    expect(looksLikeCalendar(CN_ICS)).toBe(true)
  })

  it('拒绝 HTML（例如 Cloudflare 的验证页）', () => {
    expect(
      looksLikeCalendar(
        '<!DOCTYPE html><html><body>Just a moment...</body></html>',
      ),
    ).toBe(false)
  })

  it('只有 VCALENDAR 没有事件时不算日历', () => {
    expect(looksLikeCalendar('BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR')).toBe(
      false,
    )
  })

  it('带 UTF-8 BOM 也能识别', () => {
    expect(looksLikeCalendar(`\uFEFF${CN_ICS}`)).toBe(true)
  })
})

describe('getCalendarYearRange', () => {
  it('取 DTSTART / DTEND 覆盖的实际年份范围', () => {
    expect(getCalendarYearRange(CN_ICS)).toEqual({
      minYear: 2022,
      maxYear: 2026,
    })
  })

  it('没有日期字段时返回 null', () => {
    expect(getCalendarYearRange('BEGIN:VCALENDAR\nEND:VCALENDAR')).toBeNull()
  })
})

describe('parseCalendar：中国大陆日历', () => {
  const map = parseCalendar(CN_ICS, {
    fromYear: 2023,
    toYear: 2028,
    termNames: TERMS,
  })

  it('多日假期按 DTEND 排他展开', () => {
    // 20221231 ~ 20230102，DTEND 20230103 排他
    expect(map.get('2022-12-31')).toBeUndefined() // 超出 fromYear
    expect(map.get('2023-01-01')).toMatchObject({ mark: 'REST' })
    expect(map.get('2023-01-02')).toMatchObject({ mark: 'REST' })
    expect(map.get('2023-01-03')).toBeUndefined()
  })

  it('剥掉「（休）」「（班）」后缀并合并同名条目', () => {
    expect(map.get('2023-01-01')?.names).toEqual(['元旦'])
    expect(map.get('2023-01-02')?.names).toEqual(['元旦'])
    expect(map.get('2023-01-28')?.names).toEqual(['春节'])
  })

  it('（班）标记优先于（休）', () => {
    expect(map.get('2023-01-28')?.mark).toBe('WORK')
  })

  it('节气条目进入 termNames，而不是 names', () => {
    expect(map.get('2023-01-05')).toMatchObject({
      names: [],
      termNames: ['小寒'],
    })
    expect(map.get('2023-01-01')?.termNames).toEqual([])
  })

  it('与节气同名的多日假期仍进 names（清明（休）不会被误判成节气）', () => {
    expect(map.get('2026-04-04')).toMatchObject({
      names: ['清明'],
      termNames: [],
      mark: 'REST',
    })
    expect(map.get('2026-04-05')).toMatchObject({
      names: ['清明'],
      termNames: ['清明'],
      mark: 'REST',
    })
    expect(map.get('2026-04-06')).toMatchObject({
      names: ['清明'],
      termNames: [],
      mark: 'REST',
    })
    expect(map.get('2026-04-07')).toBeUndefined()
  })

  it('RRULE 年度重复展开到范围内', () => {
    for (const year of [2023, 2024, 2025, 2026, 2027]) {
      expect(map.get(`${year}-01-01`)?.names).toContain('元旦')
    }
  })
})

describe('parseCalendar：HK 繁体节气', () => {
  it('繁体节气名也进入 termNames', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260305
SUMMARY;LANGUAGE=zh_HK:驚蟄
END:VEVENT
END:VCALENDAR`
    const map = parseCalendar(ics, {
      fromYear: 2026,
      toYear: 2026,
      termNames: TERMS,
    })
    expect(map.get('2026-03-05')).toMatchObject({
      names: [],
      termNames: ['驚蟄'],
    })
  })
})

describe('parseCalendar：美国日历（BYDAY 规则）', () => {
  const map = parseCalendar(US_ICS, { fromYear: 2026, toYear: 2031 })

  it('感恩节 = 11 月第 4 个周四', () => {
    expect(map.get('2026-11-26')?.names).toEqual(['Thanksgiving Day'])
    expect(map.get('2027-11-25')?.names).toEqual(['Thanksgiving Day'])
    expect(map.get('2028-11-23')?.names).toEqual(['Thanksgiving Day'])
  })

  it('阵亡将士纪念日 = 5 月最后一个周一', () => {
    expect(map.get('2026-05-25')?.names).toEqual(['Memorial Day'])
    expect(map.get('2027-05-31')?.names).toEqual(['Memorial Day'])
  })

  it('固定日期的年度重复（情人节）', () => {
    expect(map.get('2027-02-14')?.names).toEqual(['Valentine’s Day'])
  })

  it('COUNT 用尽后不再展开', () => {
    expect(map.get('2030-11-28')?.names).toEqual(['Thanksgiving Day'])
    expect(map.get('2031-11-27')).toBeUndefined()
  })

  it('没有标记的条目不打休/班', () => {
    expect(map.get('2026-11-26')?.mark).toBeUndefined()
  })
})

describe('parseCalendar：BYMONTHDAY（加拿大真实数据）', () => {
  it('按公历日重复', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20250815
SUMMARY;LANGUAGE=en:National Acadian Day
RRULE:FREQ=YEARLY;COUNT=5;BYMONTHDAY=15;BYMONTH=8
END:VEVENT
END:VCALENDAR`
    const map = parseCalendar(ics, { fromYear: 2025, toYear: 2029 })
    for (const year of [2025, 2026, 2027, 2028, 2029]) {
      expect(map.get(`${year}-08-15`)?.names).toEqual(['National Acadian Day'])
    }
  })
})

describe('parseCalendar：异常与边界', () => {
  it('折叠行（换行 + 空格）会被还原', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260101
SUMMARY:这是一个很长的节日名字
 需要跨行显示
END:VEVENT
END:VCALENDAR`
    const map = parseCalendar(ics, { fromYear: 2026, toYear: 2026 })
    expect(map.get('2026-01-01')?.names).toEqual([
      '这是一个很长的节日名字需要跨行显示',
    ])
  })

  it('转义字符还原', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260101
SUMMARY:New Year\\, Holiday
END:VEVENT
END:VCALENDAR`
    const map = parseCalendar(ics, { fromYear: 2026, toYear: 2026 })
    expect(map.get('2026-01-01')?.names).toEqual(['New Year, Holiday'])
  })

  it('带时间的 DTSTART 只取日期部分', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260101T090000Z
SUMMARY:Test
END:VEVENT
END:VCALENDAR`
    const map = parseCalendar(ics, { fromYear: 2026, toYear: 2026 })
    expect(map.get('2026-01-01')?.names).toEqual(['Test'])
  })

  it('不存在的日期（2 月 30 日）被跳过', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260230
SUMMARY:Bad
END:VEVENT
END:VCALENDAR`
    expect(parseCalendar(ics, { fromYear: 2026, toYear: 2026 }).size).toBe(0)
  })

  it('不支持重复规则时按单日处理', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260101
SUMMARY:Monthly Only
RRULE:FREQ=MONTHLY;COUNT=12
END:VEVENT
END:VCALENDAR`
    const map = parseCalendar(ics, { fromYear: 2026, toYear: 2027 })
    expect(map.size).toBe(1)
    expect(map.get('2026-01-01')?.names).toEqual(['Monthly Only'])
  })

  it('异常超长区间被 maxRangeDays 截断', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260101
DTEND;VALUE=DATE:20261231
SUMMARY:Endless
END:VEVENT
END:VCALENDAR`
    const map = parseCalendar(ics, {
      fromYear: 2026,
      toYear: 2026,
      maxRangeDays: 10,
    })
    expect(map.size).toBe(10)
  })

  it('HTML 内容返回空 Map', () => {
    expect(
      parseCalendar('<html><body>403</body></html>', {
        fromYear: 2026,
        toYear: 2026,
      }).size,
    ).toBe(0)
  })
})

describe('rrule：规则解析', () => {
  it('解析常见的年度规则', () => {
    expect(parseRrule('FREQ=YEARLY;COUNT=5')).toMatchObject({
      interval: 1,
      count: 5,
    })
    expect(
      parseRrule('FREQ=YEARLY;COUNT=5;BYDAY=4TH;BYMONTH=11'),
    ).toMatchObject({
      byMonth: 11,
      byDay: { nth: 4, weekday: 4 },
    })
    expect(
      parseRrule('FREQ=YEARLY;COUNT=5;BYDAY=-1MO;BYMONTH=5'),
    ).toMatchObject({
      byMonth: 5,
      byDay: { nth: -1, weekday: 1 },
    })
    expect(
      parseRrule('FREQ=YEARLY;COUNT=5;BYMONTHDAY=15;BYMONTH=8'),
    ).toMatchObject({
      byMonth: 8,
      byMonthDay: 15,
    })
  })

  it('超出子集的规则返回 null', () => {
    expect(parseRrule('FREQ=MONTHLY;COUNT=12')).toBeNull()
    expect(parseRrule('FREQ=YEARLY;BYWEEKNO=20')).toBeNull()
    expect(parseRrule('FREQ=YEARLY;BYDAY=MO')).toBeNull() // 不支持"每个周一"
    expect(parseRrule('FREQ=YEARLY;BYDAY=4TH;BYMONTHDAY=15')).toBeNull()
  })

  it('非法数值直接返回 null，不按错误规则展开', () => {
    expect(parseRrule('FREQ=YEARLY;BYMONTH=1,2')).toBeNull()
    expect(parseRrule('FREQ=YEARLY;INTERVAL=abc')).toBeNull()
    expect(parseRrule('FREQ=YEARLY;COUNT=abc')).toBeNull()
    expect(parseRrule('FREQ=YEARLY;BYMONTHDAY=32')).toBeNull()
  })
})

describe('rrule：星期推算', () => {
  it('第 n 个星期几', () => {
    // 2026-11 第 4 个周四是 11/26
    expect(getNthWeekdayOfMonth(2026, 11, 4, 4)).toBe(26)
    // 2026-05 最后一个周一是 5/25
    expect(getNthWeekdayOfMonth(2026, 5, -1, 1)).toBe(25)
  })

  it('不存在的第 5 个星期几返回 null', () => {
    // 2026-02 只有 4 个周四
    expect(getNthWeekdayOfMonth(2026, 2, 5, 4)).toBeNull()
  })

  it('COUNT 按实际产生的日期数计（闰日不计数）', () => {
    const twice = parseRrule('FREQ=YEARLY;COUNT=2')!
    expect(
      expandYearlyRrule(
        twice,
        { year: 2024, month: 2, day: 29 },
        2024,
        2032,
      ).map((date) => date.year),
    ).toEqual([2024, 2028])

    const thrice = parseRrule('FREQ=YEARLY;COUNT=3')!
    expect(
      expandYearlyRrule(
        thrice,
        { year: 2024, month: 2, day: 29 },
        2024,
        2032,
      ).map((date) => date.year),
    ).toEqual([2024, 2028, 2032])
  })
})
