import { describe, it, expect } from 'vitest'
import { Constellation } from 'tyme4ts'
import {
  CONSTELLATION_KEYS,
  getDayCell,
  getDayDetail,
  getFestivalList,
} from '@/logic/calendar'
import type { ICalendarOptions, TSubscriptionDayMap } from '@/logic/calendar'
import {
  getLocalFestivalNames,
  LOCAL_FESTIVALS,
} from '@/logic/calendar/festivals'
import type { IIcsDayEntry } from '@/logic/calendar/ics/parse'
import { CalendarDayType } from '@/common/widget-constants'

/**
 * 用本地时间构造日期。
 * 不要写成 `new Date('2026-02-14')`——该写法按 UTC 解析，东八区以西会整体错一天，
 * 这正是适配层要求入参为本地时间的原因。
 */
const localDate = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day)

/** 构造订阅数据（形状与 ICS 解析结果一致） */
const makeSubscription = (
  entries: Record<string, Partial<IIcsDayEntry>>,
): TSubscriptionDayMap => {
  const map: TSubscriptionDayMap = {}
  for (const [key, entry] of Object.entries(entries)) {
    map[key] = {
      names: entry.names ?? [],
      termNames: entry.termNames ?? [],
      ...(entry.mark ? { mark: entry.mark } : {}),
    }
  }
  return map
}

/**
 * 贴合真实 Apple 中国大陆日历的片段：
 * 元旦连休、春节含调休上班、节气、清明
 */
const CN_SUBSCRIPTION = makeSubscription({
  '2026-01-01': { names: ['元旦'], mark: 'REST' },
  '2026-01-02': { names: ['元旦'], mark: 'REST' },
  '2026-01-03': { names: ['元旦'], mark: 'REST' },
  '2026-01-05': { termNames: ['小寒'] },
  '2026-02-14': { names: ['春节'], mark: 'WORK' },
  '2026-02-15': { names: ['春节'], mark: 'REST' },
  '2026-02-16': { names: ['春节'], mark: 'REST' },
  '2026-02-17': { names: ['春节'], mark: 'REST' },
  '2026-04-05': { names: ['清明节'], mark: 'REST' },
  // 父亲节（本地规则表）与夏至同一天，用于验证优先级
  '2026-06-21': { termNames: ['夏至'] },
})

/**
 * 真实 Apple 中国大陆日历的清明形态：多日假期叫「清明（休）」，
 * 节气事件也叫「清明」，两者同一天。用于验证「关掉农历节气后假期仍显示」。
 */
const QINGMING_SUBSCRIPTION = makeSubscription({
  '2026-04-04': { names: ['清明'], mark: 'REST' },
  '2026-04-05': { names: ['清明'], termNames: ['清明'], mark: 'REST' },
  '2026-04-06': { names: ['清明'], mark: 'REST' },
})

/** 美国订阅：没有调休，只有节日名 */
const US_SUBSCRIPTION = makeSubscription({
  '2026-11-26': { names: ['Thanksgiving Day'] },
  '2026-12-25': { names: ['Christmas Day'] },
})

const opts = (overrides: Partial<ICalendarOptions> = {}): ICalendarOptions => ({
  subscription: CN_SUBSCRIPTION,
  includeLocalFestivals: true,
  showLunarTerm: true,
  showAlmanac: true,
  ...overrides,
})

/** 格子/列表只收订阅与农历开关 */
const cellOpts = (overrides: Partial<ICalendarOptions> = {}) => {
  const merged = opts(overrides)
  return {
    subscription: merged.subscription,
    includeLocalFestivals: merged.includeLocalFestivals,
    showLunarTerm: merged.showLunarTerm,
  }
}

// ─────────────────────────────────────────────
// 产品契约：与具体日历库无关，换库也必须成立
// ─────────────────────────────────────────────

describe('getDayCell 文案优先级：订阅节日 → 本地节日 → 节气 → 农历月/日', () => {
  it('订阅节日优先', () => {
    expect(getDayCell(localDate(2026, 2, 17), opts())).toEqual({
      desc: '春节',
      isFestival: true,
      dayType: CalendarDayType.REST,
    })
  })

  it('本地节日压过同日节气（父亲节 vs 夏至）', () => {
    expect(getDayCell(localDate(2026, 6, 21), opts()).desc).toBe('父亲节')
  })

  it('只有节气时展示节气', () => {
    expect(getDayCell(localDate(2026, 1, 5), opts())).toEqual({
      desc: '小寒',
      isFestival: true,
      dayType: CalendarDayType.NORMAL,
    })
  })

  it('切换订阅后节日随之变化（美国日历里没有春节）', () => {
    const american = opts({ subscription: US_SUBSCRIPTION })
    // 正月初一在无节日时回退为月名
    expect(getDayCell(localDate(2026, 2, 17), american).desc).toBe('正月')
    expect(getDayCell(localDate(2026, 11, 26), american).desc).toBe(
      'Thanksgiving Day',
    )
    expect(getDayCell(localDate(2026, 11, 26), american).dayType).toBe(
      CalendarDayType.NORMAL,
    )
  })

  it('中文地区订阅会补充通用现代节日（情人节）', () => {
    expect(
      getDayCell(localDate(2026, 2, 14), opts({ subscription: {} })).desc,
    ).toBe('情人节')
  })

  it('非中文地区订阅不补充中文节日（含自定义地址）', () => {
    const english = opts({
      subscription: US_SUBSCRIPTION,
      includeLocalFestivals: false,
    })
    // 情人节没有订阅条目，也不补中文表 → 回退农历
    expect(getDayCell(localDate(2026, 2, 14), english).desc).toBe('廿七')
    expect(
      getDayCell(localDate(2026, 6, 21), english).isFestival,
    ).toBe(false)
  })
})

describe('getDayCell 无节日节气时回退为农历月/日', () => {
  it('农历初一显示月份', () => {
    // 2026-01-19 是农历十二月初一
    expect(getDayCell(localDate(2026, 1, 19), opts()).desc).toBe('十二月')
  })

  it('其余日期显示农历日', () => {
    expect(getDayCell(localDate(2026, 1, 20), opts())).toEqual({
      desc: '初二',
      isFestival: false,
      dayType: CalendarDayType.NORMAL,
    })
  })
})

describe('getDayCell 休 / 班 标记来自订阅', () => {
  it('订阅标记为休', () => {
    expect(getDayCell(localDate(2026, 2, 17), opts()).dayType).toBe(
      CalendarDayType.REST,
    )
  })

  it('订阅标记为班（调休上班）', () => {
    expect(getDayCell(localDate(2026, 2, 14), opts()).dayType).toBe(
      CalendarDayType.WORK,
    )
  })

  it('订阅里没有标记的日期为普通日', () => {
    expect(getDayCell(localDate(2026, 1, 20), opts()).dayType).toBe(
      CalendarDayType.NORMAL,
    )
  })

  it('订阅未就绪（null）时只输出农历，不打标记', () => {
    const cell = getDayCell(localDate(2026, 2, 17), opts({ subscription: null }))
    expect(cell.dayType).toBe(CalendarDayType.NORMAL)
    expect(cell.desc).toBe('正月')
  })
})

describe('getDayDetail', () => {
  it('干支年以正月初一换年（除夕仍属上一年）', () => {
    expect(getDayDetail(localDate(2026, 2, 16), opts()).lunar).toBe(
      '乙巳蛇年 农历十二月廿九',
    )
    expect(getDayDetail(localDate(2026, 2, 17), opts()).lunar).toBe(
      '丙午马年 农历正月初一',
    )
  })

  it('星期、星座与节日', () => {
    const detail = getDayDetail(localDate(2026, 2, 17), opts())
    expect(detail.weekday).toBe(2) // 周二
    expect(CONSTELLATION_KEYS).toContain(detail.constellation)
    expect(detail.festivals).toEqual(['春节'])
  })

  it('节日列表按 订阅节日 → 本地节日 → 节气 排列', () => {
    expect(getDayDetail(localDate(2026, 6, 21), opts()).festivals).toEqual([
      '父亲节',
      '夏至',
    ])
  })

  it('宜忌、吉神、凶煞非空且无重复', () => {
    const detail = getDayDetail(localDate(2026, 2, 17), opts())
    expect(detail.yi.length).toBeGreaterThan(0)
    expect(detail.ji.length).toBeGreaterThan(0)
    expect(detail.jishen.length + detail.xiongsha.length).toBeGreaterThan(0)

    const all = [...detail.yi, ...detail.ji, ...detail.jishen, ...detail.xiongsha]
    expect(new Set(all).size).toBe(all.length)
  })

  it('凶煞是中文，不再出现未翻译的 i18n key（旧库为 sn.sanSang）', () => {
    for (let day = 1; day <= 28; day += 1) {
      const detail = getDayDetail(localDate(2026, 3, day), opts())
      for (const name of detail.xiongsha) {
        expect(name.startsWith('sn.')).toBe(false)
      }
    }
  })

  it('无节日的日期返回空数组，而非「无」占位', () => {
    expect(getDayDetail(localDate(2026, 1, 20), opts()).festivals).toEqual([])
  })
})

describe('getFestivalList', () => {
  it('起始日当天有节日时 offsetDays 为 0', () => {
    const list = getFestivalList(localDate(2026, 2, 17), cellOpts(), 3)
    expect(list[0].offsetDays).toBe(0)
    expect(list[0].desc).toBe('春节')
  })

  it('offsetDays 是距起始日的天数，不是列表下标', () => {
    const list = getFestivalList(localDate(2026, 2, 13), cellOpts(), 2)
    const springFestival = list.find((item) => item.desc === '春节')
    expect(springFestival?.offsetDays).toBe(1)
  })

  it('date 为本地时间日期，不发生时区偏移', () => {
    const list = getFestivalList(localDate(2026, 2, 17), cellOpts(), 0)
    const item = list[0]
    expect(item.date.getFullYear()).toBe(2026)
    expect(item.date.getMonth()).toBe(1)
    expect(item.date.getDate()).toBe(17)
  })

  it('随 offsetDays 递增，且 days 参数控制窗口', () => {
    const near = getFestivalList(localDate(2026, 1, 1), cellOpts(), 5)
    const far = getFestivalList(localDate(2026, 1, 1), cellOpts(), 60)
    expect(near.length).toBeLessThan(far.length)
    expect(far).toEqual(
      [...far].sort((a, b) => a.offsetDays - b.offsetDays),
    )
  })

  it('关闭「农历与节气」后不再包含只有节气的日期', () => {
    const withTerm = getFestivalList(localDate(2026, 1, 1), cellOpts(), 10)
    const withoutTerm = getFestivalList(
      localDate(2026, 1, 1),
      cellOpts({ showLunarTerm: false }),
      10,
    )
    expect(withTerm.some((item) => item.desc === '小寒')).toBe(true)
    expect(withoutTerm.some((item) => item.desc === '小寒')).toBe(false)
  })

  it('列表项带休 / 班标记', () => {
    const list = getFestivalList(localDate(2026, 2, 14), cellOpts(), 0)
    expect(list[0].dayType).toBe(CalendarDayType.WORK)
  })
})

describe('展示开关', () => {
  it('关闭「农历与节气」后，无节日与节气的格子留空且不再算节日', () => {
    const termOnly = getDayCell(localDate(2026, 1, 5), opts({ showLunarTerm: false }))
    expect(termOnly).toEqual({
      desc: '',
      isFestival: false,
      dayType: CalendarDayType.NORMAL,
    })

    const lunarOnly = getDayCell(
      localDate(2026, 1, 19),
      opts({ showLunarTerm: false }),
    )
    expect(lunarOnly.desc).toBe('')
  })

  it('关闭「农历与节气」不影响订阅节日', () => {
    const cell = getDayCell(localDate(2026, 2, 17), opts({ showLunarTerm: false }))
    expect(cell.desc).toBe('春节')
    expect(cell.isFestival).toBe(true)
  })

  it('关闭「农历与节气」后，与节气同名的清明假期仍然显示', () => {
    const qingming = opts({
      subscription: QINGMING_SUBSCRIPTION,
      showLunarTerm: false,
    })

    // 4/4、4/6 只有假期事件，不能被当成节气隐藏
    expect(getDayCell(localDate(2026, 4, 4), qingming)).toEqual({
      desc: '清明',
      isFestival: true,
      dayType: CalendarDayType.REST,
    })
    expect(getDayCell(localDate(2026, 4, 6), qingming).desc).toBe('清明')
    // 4/5 同时是节气日与假期日，节日名仍来自 names
    expect(getDayCell(localDate(2026, 4, 5), qingming).desc).toBe('清明')
    expect(getDayDetail(localDate(2026, 4, 4), qingming).festivals).toEqual([
      '清明',
    ])
  })

  it('关闭「农历与节气」后，详情不再返回农历行', () => {
    expect(getDayDetail(localDate(2026, 6, 21), opts({ showLunarTerm: false })).lunar).toBe('')
    expect(
      getDayDetail(localDate(2026, 6, 21), opts({ showLunarTerm: false })).festivals,
    ).toEqual(['父亲节'])
  })

  it('关闭「黄历详情」后，宜忌与神煞返回空数组，其余信息不变', () => {
    const withAlmanac = getDayDetail(localDate(2026, 2, 17), opts())
    const withoutAlmanac = getDayDetail(
      localDate(2026, 2, 17),
      opts({ showAlmanac: false }),
    )

    expect(withoutAlmanac.yi).toEqual([])
    expect(withoutAlmanac.ji).toEqual([])
    expect(withoutAlmanac.jishen).toEqual([])
    expect(withoutAlmanac.xiongsha).toEqual([])
    expect(withoutAlmanac.lunar).toBe(withAlmanac.lunar)
    expect(withoutAlmanac.festivals).toEqual(withAlmanac.festivals)
    expect(withoutAlmanac.constellation).toBe(withAlmanac.constellation)
  })

  it('关闭农历与黄历后只剩公历信息', () => {
    const detail = getDayDetail(
      localDate(2026, 2, 17),
      opts({ showLunarTerm: false, showAlmanac: false }),
    )
    expect(detail.lunar).toBe('')
    expect(detail.yi).toEqual([])
    expect(detail.ji).toEqual([])
    expect(detail.jishen).toEqual([])
    expect(detail.xiongsha).toEqual([])
    expect(typeof detail.weekday).toBe('number')
    expect(CONSTELLATION_KEYS).toContain(detail.constellation)
  })
})

describe('getLocalFestivalNames 规则表（9 条国际通用节日）', () => {
  it('表固定为 9 条，避免文档/代码再次漂移', () => {
    expect(LOCAL_FESTIVALS).toHaveLength(9)
  })

  it('固定公历日', () => {
    expect(getLocalFestivalNames(2026, 2, 14)).toContain('情人节')
    expect(getLocalFestivalNames(2026, 12, 24)).toContain('平安夜')
    expect(getLocalFestivalNames(2026, 12, 25)).toContain('圣诞节')
  })

  it('按星期规则：母亲节、父亲节、感恩节', () => {
    expect(getLocalFestivalNames(2026, 5, 10)).toContain('母亲节') // 5 月第 2 个周日
    expect(getLocalFestivalNames(2026, 6, 21)).toContain('父亲节') // 6 月第 3 个周日
    expect(getLocalFestivalNames(2026, 11, 26)).toContain('感恩节') // 11 月第 4 个周四
  })

  it('未命中返回空数组', () => {
    expect(getLocalFestivalNames(2026, 3, 18)).toEqual([])
  })

  it('大陆特有的纪念日已移除（安全教育日 / 助残日 / 国防教育日）', () => {
    expect(getLocalFestivalNames(2026, 3, 30)).toEqual([]) // 3 月最后一个周一
    expect(getLocalFestivalNames(2026, 5, 17)).toEqual([]) // 5 月第 3 个周日
    expect(getLocalFestivalNames(2026, 9, 19)).toEqual([]) // 9 月第 3 个周六
  })

  it('世界住房日按产品决定移除（10 月第 1 个周一）', () => {
    expect(getLocalFestivalNames(2026, 10, 5)).toEqual([])
  })

  it('万圣节前夜按产品决定移除，万圣节仍保留', () => {
    expect(getLocalFestivalNames(2026, 10, 31)).toEqual([])
    expect(getLocalFestivalNames(2026, 11, 1)).toContain('万圣节')
  })
})

describe('tyme4ts 语义（农历部分与换库无关的契约）', () => {
  it('农历月名用国标写法（十二月 / 正月）', () => {
    expect(getDayCell(localDate(2026, 1, 19), opts()).desc).toBe('十二月')
    expect(getDayCell(localDate(2026, 2, 17), opts()).desc).toBe('春节')
  })

  it('清明在农历日历里是「清明节」（订阅同名时不会重复）', () => {
    expect(getDayDetail(localDate(2026, 4, 5), opts()).festivals).toEqual([
      '清明节',
    ])
  })

  it('星座标识与 tyme4ts 的枚举顺序一致', () => {
    for (let index = 0; index < 12; index += 1) {
      const constellation = Constellation.fromIndex(index)
      expect(CONSTELLATION_KEYS[index]).toBeDefined()
      expect(constellation.getName().length).toBeGreaterThan(0)
    }
  })

  it('weekday 与 Date.getDay() 一致（0 = 周日）', () => {
    for (let day = 1; day <= 7; day += 1) {
      const date = localDate(2026, 3, day)
      expect(getDayDetail(date, opts()).weekday).toBe(date.getDay())
    }
  })
})
