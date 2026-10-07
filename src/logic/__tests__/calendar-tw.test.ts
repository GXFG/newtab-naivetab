import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { Lunar } from 'lunar-typescript'
import { CalendarDayType } from '@/common/widget-constants'
import {
  getTaiwanFestivalInfo,
  getTaiwanHolidayInfo,
} from '@/newtab/widgets/calendarTw/taiwan-holidays'

const getLunar = (date: string) =>
  Lunar.fromDate(new Date(`${date}T12:00:00`))

describe('calendarTw Taiwan calendar data', () => {
  it('uses Taiwan National Day instead of China National Day on Oct 1', () => {
    const chinaNationalDay = dayjs('2026-10-01')
    const taiwanNationalDay = dayjs('2026-10-10')

    expect(
      getTaiwanFestivalInfo(
        chinaNationalDay,
        getLunar(chinaNationalDay.format('YYYY-MM-DD')),
      ),
    ).toBeNull()

    expect(
      getTaiwanFestivalInfo(
        taiwanNationalDay,
        getLunar(taiwanNationalDay.format('YYYY-MM-DD')),
      ),
    ).toEqual({
      name: '國慶日',
      type: CalendarDayType.REST,
    })
  })

  it('always displays Taiwan festival names in Traditional Chinese', () => {
    expect(
      getTaiwanFestivalInfo(dayjs('2026-09-25'), getLunar('2026-09-25')),
    ).toEqual({
      name: '中秋節',
      type: CalendarDayType.REST,
    })
    expect(
      getTaiwanFestivalInfo(dayjs('2026-09-28'), getLunar('2026-09-28')),
    ).toEqual({
      name: '教師節',
      type: CalendarDayType.REST,
    })
    expect(
      getTaiwanFestivalInfo(dayjs('2026-10-09'), getLunar('2026-10-09')),
    ).toEqual({
      name: '國慶日補假',
      type: CalendarDayType.REST,
    })
  })

  it('marks the 2026 Mid-Autumn / Teachers Day long weekend as Taiwan rest days', () => {
    const midAutumn = dayjs('2026-09-25')
    const weekend = dayjs('2026-09-26')
    const teachersDay = dayjs('2026-09-28')

    expect(getTaiwanHolidayInfo(midAutumn, getLunar('2026-09-25'))).toEqual({
      nameKey: 'calendarTw.holiday.midAutumn',
      type: CalendarDayType.REST,
    })
    expect(getTaiwanHolidayInfo(weekend, getLunar('2026-09-26'))).toEqual({
      nameKey: undefined,
      type: CalendarDayType.REST,
    })
    expect(
      getTaiwanHolidayInfo(teachersDay, getLunar('2026-09-28')),
    ).toEqual({
      nameKey: 'calendarTw.holiday.teachersDay',
      type: CalendarDayType.REST,
    })
  })

  it('keeps solar terms while filtering non-Taiwan festivals', () => {
    const autumnEquinox = dayjs('2026-09-23')

    expect(
      getTaiwanFestivalInfo(autumnEquinox, getLunar('2026-09-23')),
    ).toEqual({
      name: '秋分',
      type: CalendarDayType.NORMAL,
    })
  })
})
