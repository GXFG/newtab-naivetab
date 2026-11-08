/** 预设地区类型（与适配层无关，仅用于配置取值） */
import type { TSubscriptionRegion } from '@/logic/calendar/subscriptions'

export const WIDGET_CODE = 'calendar'

/**
 * 可浏览的年份范围。
 *
 * 与 `logic/calendar/subscriptions.ts` 的 MIN_PARSE_YEAR / MAX_PARSE_YEAR 保持一致：
 * 订阅的解析窗口本来就钳在 1900–2100，日历翻出这个范围只会看到农历与黄历，
 * 节日与休班必然为空。把两处边界对齐，「翻得到的年份」与「有节日数据的年份」
 * 就不会给人两套口径。
 *
 * 下限取 1900 而不是 2000：万年历的高频用途之一是查农历生日，
 * 2000 起会挡住 1990 年代及更早出生的人查自己。tyme4ts 在 1900 年附近计算正常
 * （已实测 1850 / 1900 / 2200 均可正确返回农历）。
 */
export const CALENDAR_MIN_YEAR = 1900
export const CALENDAR_MAX_YEAR = 2100

/** 年月的单调序号：跨年比较、钳制都换算成它，避免各写一遍 12 进制进位 */
export const toYearMonth = (year: number, month: number): number =>
  year * 12 + month

/**
 * 把年月钳制进 [1900-01, 2100-12]。
 *
 * 只做钳制、不做取舍：调用方拿到的一定是范围内且合法的年月，
 * 因此箭头翻月、下拉选年、回到今日三条路径可以共用同一份边界。
 */
export const clampYearMonth = (
  year: number,
  month: number,
): { year: number; month: number } => {
  const min = toYearMonth(CALENDAR_MIN_YEAR, 1)
  const max = toYearMonth(CALENDAR_MAX_YEAR, 12)
  const clamped = Math.min(max, Math.max(min, toYearMonth(year, month)))
  return {
    year: Math.floor((clamped - 1) / 12),
    month: ((clamped - 1) % 12) + 1,
  }
}

export const SCALABLE_FIELDS = {
  width: { min: 16, max: 120 },
  fontSize: { min: 6, max: 40 },
  dayFontSize: { min: 8, max: 50 },
  descFontSize: { min: 4, max: 30 },
  borderRadius: { min: 0, max: 20 },
}

export const WIDGET_CONFIG = {
  enabled: true,
  weekBeginsOn: 1,
  festivalCountdown: true,
  /** 节假日订阅地区：ISO 3166-1 alpha-2，'custom' 表示使用下面的自定义地址 */
  subscriptionRegion: 'CN' as TSubscriptionRegion | 'custom',
  /** 自定义订阅地址（subscriptionRegion 为 'custom' 时生效） */
  customSubscriptionUrl: '',
  /** 是否显示休 / 班标记（关闭后不影响节日与节气展示） */
  isHolidayMarkVisible: true,
  /** 是否显示农历与节气（关闭后格子第二行、详情农历行、倒计时节气条目都不展示） */
  isLunarTermVisible: true,
  /** 是否显示黄历详情（宜、忌、吉神、凶煞） */
  isAlmanacVisible: true,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 0,
    xTranslateValue: 0,
    yOffsetKey: 'bottom',
    yOffsetValue: 0,
    yTranslateValue: 0,
  },
  width: 45,
  borderRadius: 4,
  fontFamily: 'system',
  fontSize: 13,
  fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
  dayFontFamily: 'system',
  dayFontSize: 16,
  dayFontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
  descFontFamily: 'system',
  descFontSize: 10,
  descFontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
  backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(52, 52, 57, 0.65)'],
  backgroundBlur: 5,
  isBorderEnabled: false,
  borderWidth: 1,
  borderColor: ['rgba(239, 239, 245, 1)', 'rgba(73, 73, 77, 1)'],
  isShadowEnabled: true,
  shadowColor: ['rgba(14, 30, 37, 0.12)', 'rgba(255, 255, 255, 0.06)'],
  holidayFontColor: ['rgba(250, 82, 82, 1)', 'rgba(250, 82, 82, 1)'],
  todayDayFontColor: ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)'],
  todayDescFontColor: ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)'],
  todayLabelFontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  todayLabelBackgroundColor: ['rgba(22, 144, 231, 1)', 'rgba(22, 144, 231, 1)'],
  todayItemBackgroundColor: [
    'rgba(159, 214, 255, 1)',
    'rgba(106, 173, 224, 1)',
  ],
  restDayFontColor: ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)'],
  restDescFontColor: ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)'],
  restLabelFontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  restLabelBackgroundColor: ['rgba(32, 146, 0, 1)', 'rgba(32, 146, 0, 1)'],
  restItemBackgroundColor: [
    'rgba(213, 255, 203, 0.8)',
    'rgba(169, 180, 156, 1)',
  ],
  workDayFontColor: ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)'],
  workDescFontColor: ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)'],
  workLabelFontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  workLabelBackgroundColor: ['rgba(250, 82, 82, 1)', 'rgba(250, 82, 82, 1)'],
  workItemBackgroundColor: ['rgba(255, 221, 221, 1)', 'rgba(218, 181, 181, 1)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
