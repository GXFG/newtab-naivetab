/**
 * @module calendar/grid
 * @description 月历网格布局的纯计算：不依赖日历库、不依赖 dayjs，便于单测。
 *
 * 网格固定为 6 行 × 7 列（42 格）——Widget 容器高度就是按 6 行算出来的
 * （`--nt-cal-customBodyWrapHeight` = 格子宽度 × 6），少一行底部就会空出两行。
 */

/** 网格行数（固定 6 行） */
export const GRID_ROW_COUNT = 6

/** 网格列数（一周 7 天） */
export const GRID_COLUMN_COUNT = 7

/** 网格格子总数 */
export const GRID_CELL_COUNT = GRID_ROW_COUNT * GRID_COLUMN_COUNT

/** 一周起始日：1 = 周一，7 = 周日 */
export type TWeekStart = 1 | 7

/** 月历网格的前后填充 */
export interface IMonthGridPadding {
  /** 上月末尾填充的格子数 */
  padStart: number
  /** 下月开头填充的格子数（已补足到 6 行） */
  padEnd: number
}

/**
 * 计算某月网格的前后填充格数，并补足到 6 行。
 *
 * 不补足时会出现 4 行的月份：2 月恰好从一周起始日开始且共 28 天
 * （如周一版 2021-02 / 2027-02、周日版 2026-02）；5 行的月份同样需要补足。
 *
 * @param firstDayWeek 当月 1 号是星期几（1 = 周一 … 7 = 周日）
 * @param lastDayWeek  当月最后一天是星期几（1 = 周一 … 7 = 周日）
 * @param dayCount     当月天数
 * @param weekBeginsOn 一周起始日
 */
export const getMonthGridPadding = (
  firstDayWeek: number,
  lastDayWeek: number,
  dayCount: number,
  weekBeginsOn: TWeekStart,
): IMonthGridPadding => {
  const padStart =
    weekBeginsOn === 7
      ? firstDayWeek === 7
        ? 0
        : firstDayWeek
      : firstDayWeek - 1

  let padEnd =
    weekBeginsOn === 7
      ? lastDayWeek === 7
        ? 6
        : 6 - lastDayWeek
      : 7 - lastDayWeek

  // 补足到 6 行：28 格（整 4 周）与 35 格（整 5 周）都要补齐
  const filledCount = padStart + dayCount + padEnd
  if (filledCount < GRID_CELL_COUNT) {
    padEnd += GRID_CELL_COUNT - filledCount
  }

  return { padStart, padEnd }
}
