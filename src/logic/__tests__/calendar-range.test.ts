import { describe, it, expect } from 'vitest'
import {
  CALENDAR_MAX_YEAR,
  CALENDAR_MIN_YEAR,
  clampYearMonth,
  toYearMonth,
} from '@/newtab/widgets/calendar/config'
import { MAX_PARSE_YEAR, MIN_PARSE_YEAR } from '@/logic/calendar/subscriptions'

/**
 * 日历的年月边界。
 *
 * 两处边界（widget 可浏览范围 / 订阅解析窗口）必须一致：
 * 翻得到但没有节日数据的年份，会让人以为订阅坏了。
 */
describe('年月序号', () => {
  it('跨年比较单调递增', () => {
    expect(toYearMonth(2026, 12)).toBeLessThan(toYearMonth(2027, 1))
    expect(toYearMonth(2026, 1)).toBeGreaterThan(toYearMonth(2025, 12))
  })

  it('月份传 0 或 13 时等价于上一月 / 下一月（箭头翻月依赖）', () => {
    expect(toYearMonth(2026, 0)).toBe(toYearMonth(2025, 12))
    expect(toYearMonth(2026, 13)).toBe(toYearMonth(2027, 1))
  })
})

describe('clampYearMonth', () => {
  it('范围内原样返回', () => {
    expect(clampYearMonth(2026, 11)).toEqual({ year: 2026, month: 11 })
  })

  it('低于下限时钳到 1900-01', () => {
    expect(clampYearMonth(1899, 12)).toEqual({
      year: CALENDAR_MIN_YEAR,
      month: 1,
    })
    // 1900-01 的上一月：箭头在端点处不能再翻
    expect(clampYearMonth(1900, 0)).toEqual({ year: 1900, month: 1 })
  })

  it('高于上限时钳到 2100-12', () => {
    expect(clampYearMonth(2101, 1)).toEqual({
      year: CALENDAR_MAX_YEAR,
      month: 12,
    })
    expect(clampYearMonth(2100, 13)).toEqual({ year: 2100, month: 12 })
  })

  it('端点本身可停留（下限/上限各自合法）', () => {
    expect(clampYearMonth(1900, 1)).toEqual({ year: 1900, month: 1 })
    expect(clampYearMonth(2100, 12)).toEqual({ year: 2100, month: 12 })
  })

  it('钳制后仍是合法月份（1–12）', () => {
    for (const [year, month] of [
      [1850, 6],
      [2200, 6],
      [1900, 0],
      [2100, 13],
    ]) {
      const clamped = clampYearMonth(year, month)
      expect(clamped.month).toBeGreaterThanOrEqual(1)
      expect(clamped.month).toBeLessThanOrEqual(12)
    }
  })
})

describe('可浏览范围与订阅解析窗口一致', () => {
  it('两处边界相同，避免「翻得到但永远没有节日」的年份', () => {
    expect(CALENDAR_MIN_YEAR).toBe(MIN_PARSE_YEAR)
    expect(CALENDAR_MAX_YEAR).toBe(MAX_PARSE_YEAR)
  })
})
