import { describe, it, expect } from 'vitest'
import {
  GRID_CELL_COUNT,
  GRID_ROW_COUNT,
  getMonthGridPadding,
} from '@/logic/calendar/grid'

/** JS 的 getDay() 周日为 0，这里统一成 1=周一 … 7=周日 */
const toWeekIndex = (date: Date) => (date.getDay() === 0 ? 7 : date.getDay())

const paddingOf = (year: number, month: number, weekBeginsOn: 1 | 7) => {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  return getMonthGridPadding(
    toWeekIndex(firstDay),
    toWeekIndex(lastDay),
    lastDay.getDate(),
    weekBeginsOn,
  )
}

describe('getMonthGridPadding', () => {
  it('网格固定 6 行 × 7 列', () => {
    expect(GRID_ROW_COUNT).toBe(6)
    expect(GRID_CELL_COUNT).toBe(42)
  })

  it('2 月整 4 周时补足到 6 行（周一起始，2027-02 / 2021-02）', () => {
    // 2027-02-01 是周一、2027-02-28 是周日
    expect(getMonthGridPadding(1, 7, 28, 1)).toEqual({
      padStart: 0,
      padEnd: 14,
    })
  })

  it('2 月整 4 周时补足到 6 行（周日起始，2026-02）', () => {
    // 2026-02-01 是周日、2026-02-28 是周六
    expect(getMonthGridPadding(7, 6, 28, 7)).toEqual({
      padStart: 0,
      padEnd: 14,
    })
  })

  it('整 5 周时补足到 6 行（回归：原实现只处理了这一种）', () => {
    // 2026-03-01 是周日、2026-03-31 是周二 → 周一起始为 6 + 31 + 5 = 42
    expect(getMonthGridPadding(7, 2, 31, 1)).toEqual({ padStart: 6, padEnd: 5 })
    // 构造整 5 周：周一起始、1 号周一、31 天 → 0 + 31 + 4 = 35 → 补 7
    expect(getMonthGridPadding(1, 3, 31, 1)).toEqual({ padStart: 0, padEnd: 11 })
  })

  it('整 6 周时不额外补', () => {
    // 周一起始、1 号周日、30 天 → 6 + 30 + 6 = 42
    expect(getMonthGridPadding(7, 6, 30, 1)).toEqual({ padStart: 6, padEnd: 6 })
  })

  it('周一起始的前后填充按周一为第一列计算', () => {
    // 2027-02：1 号周一 → 无上月填充
    expect(paddingOf(2027, 2, 1).padStart).toBe(0)
    // 2027-03：1 号周一 → 无上月填充；31 天，最后一天周三 → 本周补 4 天后再补足到 6 行
 
    expect(paddingOf(2027, 3, 1)).toEqual({ padStart: 0, padEnd: 11 })
  })

  it('周日起始的前后填充按周日为第一列计算', () => {
    // 2027-02：1 号周一 → 上月补 1 天；28 天，最后一天周日 → 补到 6 行
    expect(paddingOf(2027, 2, 7)).toEqual({ padStart: 1, padEnd: 13 })
  })

  it('2020–2035 的每一个月都是 6 行（两种周起始都覆盖）', () => {
    for (const weekBeginsOn of [1, 7] as const) {
      for (let year = 2020; year <= 2035; year += 1) {
        for (let month = 1; month <= 12; month += 1) {
          const firstDay = new Date(year, month - 1, 1)
          const lastDay = new Date(year, month, 0)
          const { padStart, padEnd } = paddingOf(year, month, weekBeginsOn)
          const total = padStart + lastDay.getDate() + padEnd

          expect(
            total,
            `${year}-${month}（周起始 ${weekBeginsOn}）应为 42 格`,
          ).toBe(GRID_CELL_COUNT)
          expect(padStart).toBeGreaterThanOrEqual(0)
          expect(padEnd).toBeGreaterThanOrEqual(0)
          expect(firstDay.getMonth()).toBe(month - 1)
        }
      }
    }
  })
})
