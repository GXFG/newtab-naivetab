/**
 * @module calendar/regions/validate
 * @description 地区节假日数据的完整性校验（纯函数）。
 *
 * 由 scripts/check/validate-holidays.ts 在 pre-commit 中对 regions/*.json 执行，
 * 单测也用它验证“坏数据必须被发现”。
 *
 * 校验重点放在**休班日期**上：节日名写错影响很小，把休息日标成上班影响很大。
 * @see ./README.md#校验规则
 */
import { LunarFestival, SolarFestival } from 'tyme4ts'
import { LOCAL_FESTIVALS } from '../festivals'
import { buildFestivalEvent } from './rules'
import type { IRegionData, TRegionWeek } from './types'

/** tyme4ts 内置的节日名（阳历 + 农历），库升级改名时会让 exclude 校验失败 */
export const BUILTIN_FESTIVAL_NAMES: ReadonlySet<string> = new Set([
  ...SolarFestival.NAMES,
  ...LunarFestival.NAMES,
])

/** 通用现代节日名（见 ../festivals.ts） */
export const COMMON_FESTIVAL_NAMES: ReadonlySet<string> = new Set(
  LOCAL_FESTIVALS.map((festival) => festival.name),
)

/** 未传 fileName 时的占位值：此时跳过「region 与文件名一致」检查 */
const UNKNOWN_FILE_NAME = '地区数据'

const WEEKS: readonly TRegionWeek[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
]

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isIntegerInRange = (value: unknown, min: number, max: number): boolean =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max

/** 校验 YYYY-MM-DD 且日期真实存在 */
const isRealDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false

  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!matched) return false

  const [year, month, day] = matched.slice(1).map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/** 校验单条节日规则 */
const validateRule = (
  rule: unknown,
  prefix: string,
  errors: string[],
): void => {
  if (!rule || typeof rule !== 'object') {
    errors.push(`${prefix}：rule 必须是对象`)
    return
  }

  const candidate = rule as Record<string, unknown>
  switch (candidate.type) {
    case 'solarDay':
      if (
        !isIntegerInRange(candidate.month, 1, 12) ||
        !isIntegerInRange(candidate.day, 1, 31)
      ) {
        errors.push(`${prefix}：solarDay 的 month/day 越界`)
      }
      break
    case 'solarWeek':
      if (!isIntegerInRange(candidate.month, 1, 12)) {
        errors.push(`${prefix}：solarWeek 的 month 越界`)
      }
      if (candidate.index !== -1 && !isIntegerInRange(candidate.index, 1, 5)) {
        errors.push(
          `${prefix}：solarWeek 的 index 只能是 1~5 或 -1（最后一个）`,
        )
      }
      if (!WEEKS.includes(candidate.week as TRegionWeek)) {
        errors.push(`${prefix}：solarWeek 的 week 必须是 ${WEEKS.join('/')}`)
      }
      break
    case 'lunarDay':
      if (
        !isIntegerInRange(candidate.month, 1, 12) ||
        !isIntegerInRange(candidate.day, 1, 30)
      ) {
        errors.push(`${prefix}：lunarDay 的 month/day 越界`)
      }
      break
    case 'termDay':
      if (!isNonEmptyString(candidate.term)) {
        errors.push(`${prefix}：termDay 缺少 term（节气名）`)
      }
      break
    default:
      errors.push(`${prefix}：未知规则类型 ${String(candidate.type)}`)
      return
  }

  // 最终以库能否构建为准（覆盖节气名非法等情况）
  try {
    buildFestivalEvent({ name: prefix, rule } as never)
  } catch (error) {
    errors.push(`${prefix}：规则无法构建（${(error as Error).message}）`)
  }
}

/** 校验某年的休班安排 */
const validateYear = (
  yearKey: string,
  value: unknown,
  errors: string[],
): void => {
  const prefix = `[${yearKey}]`

  if (!/^\d{4}$/.test(yearKey)) {
    errors.push(`${prefix}：年份键必须是 4 位数字`)
  }
  if (!value || typeof value !== 'object') {
    errors.push(`${prefix}：该年数据必须是对象`)
    return
  }

  const yearData = value as Record<string, unknown>
  if (!isNonEmptyString(yearData.source)) errors.push(`${prefix}：缺少 source`)
  if (!isNonEmptyString(yearData.sourceUrl)) {
    errors.push(`${prefix}：缺少 sourceUrl`)
  }
  if (!isRealDate(yearData.verifiedAt)) {
    errors.push(`${prefix}：verifiedAt 必须是真实存在的 YYYY-MM-DD`)
  }
  if (!Array.isArray(yearData.rest)) {
    errors.push(`${prefix}：rest 必须是数组`)
  }
  if (!Array.isArray(yearData.work)) {
    errors.push(`${prefix}：work 必须是数组`)
  }
  if (!Array.isArray(yearData.rest) || !Array.isArray(yearData.work)) return

  const restDates = new Set<string>()
  for (const item of yearData.rest) {
    const day = item as Record<string, unknown>
    if (!isRealDate(day?.date)) {
      errors.push(`${prefix}：rest 中存在非法日期 ${JSON.stringify(day)}`)
      continue
    }
    if (!day.date.startsWith(yearKey)) {
      errors.push(`${prefix}：rest 的 ${day.date} 不属于该年`)
    }
    if (restDates.has(day.date)) errors.push(`${prefix}：rest 重复 ${day.date}`)
    restDates.add(day.date)
  }

  const workDates = new Set<string>()
  for (const item of yearData.work) {
    if (!isRealDate(item)) {
      errors.push(`${prefix}：work 中存在非法日期 ${JSON.stringify(item)}`)
      continue
    }
    if (!item.startsWith(yearKey)) {
      errors.push(`${prefix}：work 的 ${item} 不属于该年`)
    }
    if (workDates.has(item)) errors.push(`${prefix}：work 重复 ${item}`)
    workDates.add(item)
  }

  for (const date of workDates) {
    if (restDates.has(date)) {
      errors.push(`${prefix}：${date} 同时出现在 rest 与 work`)
    }
  }
}

/**
 * 校验一份地区数据
 * @returns 错误信息列表，空数组表示通过
 */
export const validateRegionData = (
  input: unknown,
  fileName = UNKNOWN_FILE_NAME,
): string[] => {
  const errors: string[] = []

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [`${fileName}：根节点必须是对象`]
  }

  const data = input as Partial<IRegionData>
  if (!isNonEmptyString(data.region)) {
    errors.push('缺少 region')
  } else if (
    fileName !== UNKNOWN_FILE_NAME &&
    `${data.region.toLowerCase()}.json` !== fileName
  ) {
    errors.push(`region（${data.region}）与文件名（${fileName}）不一致`)
  }
  if (!isNonEmptyString(data.scheme)) errors.push('缺少 scheme（假期口径）')

  // ── exclude / add ──
  const { exclude, add } = data
  if (!Array.isArray(exclude)) errors.push('exclude 必须是数组')
  if (!Array.isArray(add)) errors.push('add 必须是数组')

  const addNames = new Set<string>()
  if (Array.isArray(add)) {
    for (const festival of add) {
      const name = (festival as { name?: unknown })?.name
      if (!isNonEmptyString(name)) {
        errors.push(`add 中存在缺少 name 的条目：${JSON.stringify(festival)}`)
        continue
      }
      if (addNames.has(name)) errors.push(`add 中节日名重复：${name}`)
      addNames.add(name)

      if (BUILTIN_FESTIVAL_NAMES.has(name) || COMMON_FESTIVAL_NAMES.has(name)) {
        errors.push(
          `add 中的「${name}」已由 tyme4ts 内置表或通用节日表提供，无需重复声明`,
        )
      }
      validateRule((festival as { rule?: unknown }).rule, name, errors)
    }
  }

  if (Array.isArray(exclude)) {
    const seen = new Set<string>()
    for (const name of exclude) {
      if (!isNonEmptyString(name)) {
        errors.push(`exclude 中存在非法条目：${JSON.stringify(name)}`)
        continue
      }
      if (seen.has(name)) errors.push(`exclude 重复：${name}`)
      seen.add(name)

      if (
        !BUILTIN_FESTIVAL_NAMES.has(name) &&
        !COMMON_FESTIVAL_NAMES.has(name)
      ) {
        errors.push(
          `exclude 中的「${name}」不存在于 tyme4ts 内置表或通用节日表（库改名后会触发此错误）`,
        )
      }
      if (addNames.has(name)) {
        errors.push(`「${name}」同时出现在 exclude 与 add`)
      }
    }
  }

  // ── years ──
  const { years } = data
  if (!years || typeof years !== 'object' || Array.isArray(years)) {
    errors.push('years 必须是对象')
    return errors
  }

  const yearKeys = Object.keys(years).sort()
  for (const yearKey of yearKeys) validateYear(yearKey, years[yearKey], errors)

  for (let i = 1; i < yearKeys.length; i += 1) {
    const prev = Number(yearKeys[i - 1])
    const curr = Number(yearKeys[i])
    if (curr - prev > 1) {
      errors.push(`年份不连续：${yearKeys[i - 1]} 与 ${yearKeys[i]} 之间缺数据`)
    }
  }

  return errors
}
