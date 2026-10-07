import type { Dayjs } from 'dayjs'
import type { Lunar } from 'lunar-typescript'
import { CalendarDayType } from '@/common/widget-constants'

export type TaiwanHolidayInfo = {
  nameKey?: string
  type: CalendarDayType
}

export type TaiwanFestivalInfo = {
  name: string
  type: CalendarDayType
}

type HolidayRange = {
  start: string
  end: string
}

// 2026（民國 115 年）依行政院人事行政總處公布之政府行政機關辦公日曆表。
// 連假中的週末也標記為休息日，但僅在實際節日/補假日顯示節日名稱。
const TAIWAN_2026_REST_RANGES: HolidayRange[] = [
  { start: '2026-01-01', end: '2026-01-01' },
  { start: '2026-02-14', end: '2026-02-22' },
  { start: '2026-02-27', end: '2026-03-01' },
  { start: '2026-04-03', end: '2026-04-06' },
  { start: '2026-05-01', end: '2026-05-03' },
  { start: '2026-06-19', end: '2026-06-21' },
  { start: '2026-09-25', end: '2026-09-28' },
  { start: '2026-10-09', end: '2026-10-11' },
  { start: '2026-10-24', end: '2026-10-26' },
  { start: '2026-12-25', end: '2026-12-27' },
]

const TAIWAN_2026_HOLIDAY_NAMES: Record<string, string> = {
  '2026-01-01': 'calendarTw.holiday.newYear',
  '2026-02-16': 'calendarTw.holiday.lunarNewYearsEve',
  '2026-02-17': 'calendarTw.holiday.springFestival',
  '2026-02-18': 'calendarTw.holiday.springFestival',
  '2026-02-19': 'calendarTw.holiday.springFestival',
  '2026-02-20': 'calendarTw.holiday.springFestivalObserved',
  '2026-02-27': 'calendarTw.holiday.peaceMemorialDayObserved',
  '2026-02-28': 'calendarTw.holiday.peaceMemorialDay',
  '2026-04-03': 'calendarTw.holiday.childrensDayObserved',
  '2026-04-04': 'calendarTw.holiday.childrensDay',
  '2026-04-05': 'calendarTw.holiday.qingming',
  '2026-04-06': 'calendarTw.holiday.qingmingObserved',
  '2026-05-01': 'calendarTw.holiday.labourDay',
  '2026-06-19': 'calendarTw.holiday.dragonBoat',
  '2026-09-25': 'calendarTw.holiday.midAutumn',
  '2026-09-28': 'calendarTw.holiday.teachersDay',
  '2026-10-09': 'calendarTw.holiday.nationalDayObserved',
  '2026-10-10': 'calendarTw.holiday.nationalDay',
  '2026-10-25': 'calendarTw.holiday.retrocessionDay',
  '2026-10-26': 'calendarTw.holiday.retrocessionDayObserved',
  '2026-12-25': 'calendarTw.holiday.constitutionDay',
}

const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'calendarTw.holiday.newYear',
  '02-28': 'calendarTw.holiday.peaceMemorialDay',
  '04-04': 'calendarTw.holiday.childrensDay',
  '05-01': 'calendarTw.holiday.labourDay',
  '09-28': 'calendarTw.holiday.teachersDay',
  '10-10': 'calendarTw.holiday.nationalDay',
  '10-25': 'calendarTw.holiday.retrocessionDay',
  '12-25': 'calendarTw.holiday.constitutionDay',
}

/**
 * 台灣常見傳統節慶。
 *
 * lunar-typescript 的 getFestivals()/Solar.getFestivals() 內含中國大陸節慶與
 * 國際紀念日，台灣版日曆不可直接使用，因此只保留台灣日曆常見項目。
 */
const TAIWAN_LUNAR_FESTIVALS: Record<string, string> = {
  '1-15': 'calendarTw.festival.lanternFestival',
  '7-7': 'calendarTw.festival.qixi',
  '7-15': 'calendarTw.festival.ghostFestival',
  '9-9': 'calendarTw.festival.doubleNinth',
}

/**
 * 台灣版萬年曆的節慶名稱固定使用繁體中文顯示。
 * 這個 Widget 是台灣在地行事曆，節慶名稱不跟著全域 UI 語系切成英文，
 * 避免畫面出現「Mid-Autumn Festival / Teachers' Day / National Day」等混用情況。
 */
const TAIWAN_TRADITIONAL_FESTIVAL_NAMES: Record<string, string> = {
  'calendarTw.holiday.newYear': '元旦',
  'calendarTw.holiday.lunarNewYearsEve': '除夕',
  'calendarTw.holiday.springFestival': '春節',
  'calendarTw.holiday.springFestivalObserved': '春節補假',
  'calendarTw.holiday.peaceMemorialDay': '和平紀念日',
  'calendarTw.holiday.peaceMemorialDayObserved': '和平紀念日補假',
  'calendarTw.holiday.childrensDay': '兒童節',
  'calendarTw.holiday.childrensDayObserved': '兒童節補假',
  'calendarTw.holiday.qingming': '清明節',
  'calendarTw.holiday.qingmingObserved': '清明節補假',
  'calendarTw.holiday.labourDay': '勞動節',
  'calendarTw.holiday.dragonBoat': '端午節',
  'calendarTw.holiday.midAutumn': '中秋節',
  'calendarTw.holiday.teachersDay': '教師節',
  'calendarTw.holiday.nationalDay': '國慶日',
  'calendarTw.holiday.nationalDayObserved': '國慶日補假',
  'calendarTw.holiday.retrocessionDay': '臺灣光復節',
  'calendarTw.holiday.retrocessionDayObserved': '臺灣光復節補假',
  'calendarTw.holiday.constitutionDay': '行憲紀念日',
  'calendarTw.festival.lanternFestival': '元宵節',
  'calendarTw.festival.qixi': '七夕',
  'calendarTw.festival.ghostFestival': '中元節',
  'calendarTw.festival.doubleNinth': '重陽節',
}

/** lunar-typescript 回傳簡體節氣名稱時轉為台灣慣用繁體。 */
const SOLAR_TERM_TRADITIONAL_MAP: Record<string, string> = {
  惊蛰: '驚蟄',
  谷雨: '穀雨',
  小满: '小滿',
  芒种: '芒種',
  处暑: '處暑',
}

const get2026Holiday = (date: string): TaiwanHolidayInfo | null => {
  const isRestDay = TAIWAN_2026_REST_RANGES.some(
    (item) => date >= item.start && date <= item.end,
  )
  if (!isRestDay) return null
  return {
    nameKey: TAIWAN_2026_HOLIDAY_NAMES[date],
    type: CalendarDayType.REST,
  }
}

/**
 * 台灣國定假日判斷。
 * - 2026 使用人事行政總處公告的實際辦公日曆（含補假與連假）。
 * - 其他年份只套用可可靠推算的現行固定/農曆節日，不猜測未公告的補假安排。
 */
export const getTaiwanHolidayInfo = (
  dateEle: Dayjs,
  lunarEle: Lunar,
): TaiwanHolidayInfo | null => {
  const date = dateEle.format('YYYY-MM-DD')
  if (dateEle.year() === 2026) {
    return get2026Holiday(date)
  }

  const fixedNameKey = FIXED_HOLIDAYS[dateEle.format('MM-DD')]
  if (fixedNameKey) {
    return { nameKey: fixedNameKey, type: CalendarDayType.REST }
  }

  if (lunarEle.getJieQi() === '清明') {
    return {
      nameKey: 'calendarTw.holiday.qingming',
      type: CalendarDayType.REST,
    }
  }

  const lunarMonth = lunarEle.getMonth()
  const lunarDay = lunarEle.getDay()
  if (lunarMonth === 1 && lunarDay >= 1 && lunarDay <= 3) {
    return {
      nameKey: 'calendarTw.holiday.springFestival',
      type: CalendarDayType.REST,
    }
  }
  if (lunarMonth === 5 && lunarDay === 5) {
    return {
      nameKey: 'calendarTw.holiday.dragonBoat',
      type: CalendarDayType.REST,
    }
  }
  if (lunarMonth === 8 && lunarDay === 15) {
    return {
      nameKey: 'calendarTw.holiday.midAutumn',
      type: CalendarDayType.REST,
    }
  }

  return null
}

/**
 * 取得台灣版萬年曆應顯示的「節慶」資訊。
 *
 * 優先順序：
 * 1. 台灣國定假日 / 補假（有名稱的日期）
 * 2. 台灣常見農曆節慶
 * 3. 二十四節氣
 *
 * 刻意不使用 Solar.getFestivals()/Lunar.getFestivals()，避免出現
 * 「國慶節（中國 10/1）」、「全民國防教育日」、「世界住房日」等
 * 非台灣行事曆項目。
 */
export const getTaiwanFestivalInfo = (
  dateEle: Dayjs,
  lunarEle: Lunar,
): TaiwanFestivalInfo | null => {
  const holidayInfo = getTaiwanHolidayInfo(dateEle, lunarEle)
  if (holidayInfo?.nameKey) {
    return {
      name:
        TAIWAN_TRADITIONAL_FESTIVAL_NAMES[holidayInfo.nameKey] ??
        holidayInfo.nameKey,
      type: holidayInfo.type,
    }
  }

  const lunarFestivalKey =
    TAIWAN_LUNAR_FESTIVALS[`${lunarEle.getMonth()}-${lunarEle.getDay()}`]
  if (lunarFestivalKey) {
    return {
      name:
        TAIWAN_TRADITIONAL_FESTIVAL_NAMES[lunarFestivalKey] ?? lunarFestivalKey,
      type: holidayInfo?.type ?? CalendarDayType.NORMAL,
    }
  }

  const solarTerm = lunarEle.getJieQi()
  if (solarTerm) {
    return {
      name: SOLAR_TERM_TRADITIONAL_MAP[solarTerm] ?? solarTerm,
      type: holidayInfo?.type ?? CalendarDayType.NORMAL,
    }
  }

  return null
}
