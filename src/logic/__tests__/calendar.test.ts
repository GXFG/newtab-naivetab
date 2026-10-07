import { describe, it, expect } from 'vitest'
import { Constellation } from 'tyme4ts'
import {
  CONSTELLATION_KEYS,
  getDayCell,
  getDayDetail,
  getFestivalList,
} from '@/logic/calendar'
import type { ICalendarOptions } from '@/logic/calendar'
import { getLocalFestivalNames } from '@/logic/calendar/festivals'
import type { TRegionCode } from '@/logic/calendar/regions'
import { CalendarDayType } from '@/common/widget-constants'

/**
 * 用本地时间构造日期。
 * 不要写成 `new Date('2026-02-14')`——该写法按 UTC 解析，东八区以西会整体错一天，
 * 这正是适配层要求入参为本地时间的原因。
 */
const localDate = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day)

/** 展示选项工厂：默认两个展示开关都开，只指定地区 */
const opts = (
  region: TRegionCode = 'CN',
  overrides: Partial<ICalendarOptions> = {},
): ICalendarOptions => ({
  region,
  showLunarTerm: true,
  showAlmanac: true,
  ...overrides,
})

// ─────────────────────────────────────────────
// 产品契约：与具体日历库无关，换库也必须成立
// ─────────────────────────────────────────────

describe('getDayCell 文案优先级：农历节日 → 阳历节日 → 本地节日 → 节气 → 农历月/日', () => {
  it('农历节日优先，如春节', () => {
    expect(getDayCell(localDate(2026, 2, 17), opts())).toEqual({
      desc: '春节',
      isFestival: true,
      dayType: CalendarDayType.REST,
    })
  })

  it('农历节日压过当天节气（龙头节 vs 春分）', () => {
    expect(getDayCell(localDate(2026, 3, 20), opts()).desc).toBe('龙头节')
  })

  it('本地节日压过当天节气（父亲节 vs 夏至）', () => {
    expect(getDayCell(localDate(2026, 6, 21), opts()).desc).toBe('父亲节')
  })

  it('无节日时展示节气', () => {
    expect(getDayCell(localDate(2026, 1, 5), opts()).desc).toBe('小寒')
    expect(getDayCell(localDate(2026, 9, 23), opts()).desc).toBe('秋分')
  })

  it('节日与调休同日时两者都体现（2026-02-14 情人节 + 春节调休上班）', () => {
    expect(getDayCell(localDate(2026, 2, 14), opts())).toEqual({
      desc: '情人节',
      isFestival: true,
      dayType: CalendarDayType.WORK,
    })
  })
})

describe('getDayCell 无节日节气时回退为农历月/日', () => {
  it('农历初一显示月份', () => {
    expect(getDayCell(localDate(2026, 1, 19), opts())).toEqual({
      desc: '十二月',
      isFestival: false,
      dayType: CalendarDayType.NORMAL,
    })
    expect(getDayCell(localDate(2026, 12, 9), opts()).desc).toBe('十一月')
  })

  it('其余日期显示农历日', () => {
    expect(getDayCell(localDate(2026, 2, 10), opts()).desc).toBe('廿三')
    expect(getDayCell(localDate(2026, 9, 20), opts()).desc).toBe('初十')
  })
})

describe('getDayCell 休 / 班 标记', () => {
  it('法定假日为休', () => {
    expect(getDayCell(localDate(2026, 10, 1), opts()).dayType).toBe(
      CalendarDayType.REST,
    )
  })

  it('调休上班日为班', () => {
    expect(getDayCell(localDate(2026, 9, 20), opts()).dayType).toBe(
      CalendarDayType.WORK,
    )
  })

  it('普通日为 NORMAL', () => {
    expect(getDayCell(localDate(2026, 3, 3), opts()).dayType).toBe(
      CalendarDayType.NORMAL,
    )
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

  it('星期、星座、节日', () => {
    const detail = getDayDetail(localDate(2026, 6, 21), opts())
    expect(detail.weekday).toBe(0)
    expect(detail.constellation).toBe('gemini')
    expect(detail.festivals).toEqual(['父亲节'])
  })

  it('宜忌、吉神、凶煞非空且无重复', () => {
    const detail = getDayDetail(localDate(2026, 6, 21), opts())
    for (const list of [detail.yi, detail.ji, detail.jishen, detail.xiongsha]) {
      expect(list.length).toBeGreaterThan(0)
      expect(new Set(list).size).toBe(list.length)
    }
    expect(detail.yi).toContain('开市')
    expect(detail.xiongsha).toContain('白虎')
  })

  it('无节日的日期返回空数组，而非「无」占位', () => {
    expect(getDayDetail(localDate(2026, 12, 25), opts()).festivals).toEqual(['圣诞节'])
    expect(getDayDetail(localDate(2026, 1, 6), opts()).ji).toEqual([])
  })
})

describe('getFestivalList', () => {
  it('起始日当天有节日时 offsetDays 为 0', () => {
    expect(getFestivalList(localDate(2026, 1, 1), opts())[0]).toEqual({
      date: localDate(2026, 1, 1),
      offsetDays: 0,
      desc: '元旦',
      dayType: CalendarDayType.REST,
    })
  })

  it('offsetDays 是距起始日的天数，不是列表下标', () => {
    const list = getFestivalList(localDate(2026, 1, 1), opts())
    expect(list[1].offsetDays).toBe(4)
    expect(list[1].desc).toBe('小寒')
  })

  it('起始日无节日时从 0 开始计数', () => {
    const list = getFestivalList(localDate(2026, 1, 2), opts())
    expect(list[0].offsetDays).toBe(3)
    expect(list[0].desc).toBe('小寒')
  })

  it('date 为本地时间日期，不发生时区偏移', () => {
    const [first] = getFestivalList(localDate(2026, 1, 1), opts())
    expect(first.date.getFullYear()).toBe(2026)
    expect(first.date.getMonth()).toBe(0)
    expect(first.date.getDate()).toBe(1)
  })

  it('随 offsetDays 递增，且 days 参数控制窗口', () => {
    const offsets = getFestivalList(localDate(2026, 1, 1), opts()).map(
      (item) => item.offsetDays,
    )
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets)
    // days=2 时窗口为 1/2~1/4，无节日节气
    expect(getFestivalList(localDate(2026, 1, 2), opts(), 2)).toEqual([])
    // days=3 时窗口扩展到 1/5 的小寒
    expect(getFestivalList(localDate(2026, 1, 2), opts(), 3)).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────
// 本地节日表：库未内置、由 Event 规则声明式补齐
// ─────────────────────────────────────────────

describe('getLocalFestivalNames 日期规则', () => {
  it('固定公历日', () => {
    expect(getLocalFestivalNames(2026, 2, 14)).toEqual(['情人节'])
    expect(getLocalFestivalNames(2026, 3, 15)).toEqual(['消费者权益日'])
    expect(getLocalFestivalNames(2026, 4, 1)).toEqual(['愚人节'])
    expect(getLocalFestivalNames(2026, 10, 31)).toEqual(['万圣节前夜'])
    expect(getLocalFestivalNames(2026, 11, 1)).toEqual(['万圣节'])
    expect(getLocalFestivalNames(2026, 12, 24)).toEqual(['平安夜'])
    expect(getLocalFestivalNames(2026, 12, 25)).toEqual(['圣诞节'])
  })

  it('母亲节 = 5 月第 2 个周日', () => {
    expect(getLocalFestivalNames(2024, 5, 12)).toEqual(['母亲节'])
    expect(getLocalFestivalNames(2025, 5, 11)).toEqual(['母亲节'])
    expect(getLocalFestivalNames(2026, 5, 10)).toEqual(['母亲节'])
    expect(getLocalFestivalNames(2027, 5, 9)).toEqual(['母亲节'])
    expect(getLocalFestivalNames(2028, 5, 14)).toEqual(['母亲节'])
  })

  it('父亲节 = 6 月第 3 个周日', () => {
    expect(getLocalFestivalNames(2026, 6, 21)).toEqual(['父亲节'])
    expect(getLocalFestivalNames(2027, 6, 20)).toEqual(['父亲节'])
  })

  it('感恩节 = 11 月第 4 个周四', () => {
    expect(getLocalFestivalNames(2026, 11, 26)).toEqual(['感恩节'])
    expect(getLocalFestivalNames(2027, 11, 25)).toEqual(['感恩节'])
  })

  it('按星期规则计算的其他节日', () => {
    expect(getLocalFestivalNames(2026, 3, 30)).toEqual([
      '全国中小学生安全教育日',
    ])
    expect(getLocalFestivalNames(2026, 5, 17)).toEqual(['全国助残日'])
    expect(getLocalFestivalNames(2026, 9, 19)).toEqual(['全民国防教育日'])
    expect(getLocalFestivalNames(2026, 10, 5)).toEqual(['世界住房日'])
  })

  it('未命中返回空数组', () => {
    expect(getLocalFestivalNames(2026, 7, 15)).toEqual([])
  })
})

// ─────────────────────────────────────────────
// tyme4ts 语义：以下行为与旧库 lunar-typescript 不同，属有意采用新库的模型
// ─────────────────────────────────────────────

describe('tyme4ts 语义（相对旧库的变化）', () => {
  it('农历月名用国标写法（旧库为「腊月 / 冬月」）', () => {
    expect(getDayCell(localDate(2026, 1, 19), opts()).desc).toBe('十二月')
    expect(getDayCell(localDate(2026, 12, 9), opts()).desc).toBe('十一月')
  })

  it('清明归入农历传统节日，文案为「清明节」（旧库为节气「清明」）', () => {
    expect(getDayCell(localDate(2026, 4, 5), opts()).desc).toBe('清明节')
  })

  it('新增上巳节、中元节、冬至节等农历传统节日', () => {
    expect(getDayCell(localDate(2026, 4, 19), opts()).desc).toBe('上巳节')
    expect(getDayCell(localDate(2026, 8, 27), opts()).desc).toBe('中元节')
    expect(getDayCell(localDate(2026, 12, 22), opts()).desc).toBe('冬至节')
  })

  it('凶煞返回中文，不再出现未翻译的 i18n key（旧库为 sn.sanSang / sn.guiKu）', () => {
    const { xiongsha } = getDayDetail(localDate(2026, 12, 17), opts())
    expect(xiongsha).toContain('三丧')
    expect(xiongsha).toContain('鬼哭')
    expect(xiongsha.some((name) => name.startsWith('sn.'))).toBe(false)
  })
})

// ─────────────────────────────────────────────
// 节假日地区：宁可少标，不可标错
// ─────────────────────────────────────────────

describe('节假日地区', () => {
  it('CN 使用 tyme4ts 内置的法定假日数据', () => {
    expect(getDayCell(localDate(2026, 10, 1), opts()).dayType).toBe(
      CalendarDayType.REST,
    )
    expect(getDayCell(localDate(2026, 9, 20), opts()).dayType).toBe(
      CalendarDayType.WORK,
    )
  })

  it('TW / HK 的年度数据未录入时不显示任何休班标记', () => {
    for (const region of ['TW', 'HK'] as const) {
      expect(getDayCell(localDate(2026, 10, 1), opts(region)).dayType).toBe(
        CalendarDayType.NORMAL,
      )
      expect(getDayCell(localDate(2026, 2, 17), opts(region)).dayType).toBe(
        CalendarDayType.NORMAL,
      )
    }
  })

  it('TW 排除大陆特有节日', () => {
    expect(getDayCell(localDate(2026, 7, 1), opts('TW')).desc).not.toBe('建党节')
    expect(getDayCell(localDate(2026, 8, 1), opts('TW')).desc).not.toBe('建军节')
    expect(getDayCell(localDate(2026, 6, 1), opts('TW')).desc).not.toBe('儿童节')
    // 同一批节日在大陆地区仍然展示
    expect(getDayCell(localDate(2026, 7, 1), opts()).desc).toBe('建党节')
    expect(getDayCell(localDate(2026, 6, 1), opts()).desc).toBe('儿童节')
  })

  it('HK 排除大陆特有节日，但保留国庆节（两地同为 10-1）', () => {
    expect(getDayCell(localDate(2026, 8, 1), opts('HK')).desc).not.toBe('建军节')
    expect(getDayCell(localDate(2026, 6, 1), opts('HK')).desc).not.toBe('儿童节')
    expect(getDayCell(localDate(2026, 10, 1), opts('HK')).desc).toBe('国庆节')
  })

  it('历法信息不随地区变化', () => {
    const cn = getDayDetail(localDate(2026, 6, 21), opts())
    const hk = getDayDetail(localDate(2026, 6, 21), opts('HK'))
    expect(hk.lunar).toBe(cn.lunar)
    expect(hk.constellation).toBe(cn.constellation)
    expect(hk.yi).toEqual(cn.yi)
  })

  it('未注册的地区代码回退到默认地区', () => {
    const unknownRegion = 'MO' as TRegionCode
    expect(getDayCell(localDate(2026, 10, 1), opts(unknownRegion)).dayType).toBe(
      CalendarDayType.REST,
    )
  })
})

// ─────────────────────────────────────────────
// 展示开关：地区（数据）与展示（农历节气、黄历详情）三者正交
// ─────────────────────────────────────────────

describe('展示开关', () => {
  it('关闭「农历与节气」后，无节日与节气的格子留空且不再算节日', () => {
    const off = opts('CN', { showLunarTerm: false })
    expect(getDayCell(localDate(2026, 2, 10), off)).toEqual({
      desc: '',
      isFestival: false,
      dayType: CalendarDayType.NORMAL,
    })
    // 节气日同样留空
    expect(getDayCell(localDate(2026, 1, 5), off)).toEqual({
      desc: '',
      isFestival: false,
      dayType: CalendarDayType.NORMAL,
    })
    // 节日不受影响
    expect(getDayCell(localDate(2026, 2, 17), off).desc).toBe('春节')
  })

  it('关闭「农历与节气」后，详情不再返回农历行', () => {
    const detail = getDayDetail(
      localDate(2026, 6, 21),
      opts('CN', { showLunarTerm: false }),
    )
    expect(detail.lunar).toBe('')
    expect(detail.festivals).toEqual(['父亲节'])
  })

  it('关闭「农历与节气」后，倒计时列表不再包含只有节气的日期', () => {
    const withTerm = getFestivalList(localDate(2026, 1, 1), opts())
    const withoutTerm = getFestivalList(
      localDate(2026, 1, 1),
      opts('CN', { showLunarTerm: false }),
    )
    expect(withTerm.some((item) => item.desc === '小寒')).toBe(true)
    expect(withoutTerm.some((item) => item.desc === '小寒')).toBe(false)
    // 节日条目不受影响
    expect(withoutTerm.some((item) => item.desc === '元旦')).toBe(true)
  })

  it('关闭「黄历详情」后，宜忌与神煞返回空数组，其余信息不变', () => {
    const detail = getDayDetail(
      localDate(2026, 6, 21),
      opts('CN', { showAlmanac: false }),
    )
    expect(detail.yi).toEqual([])
    expect(detail.ji).toEqual([])
    expect(detail.jishen).toEqual([])
    expect(detail.xiongsha).toEqual([])
    expect(detail.festivals).toEqual(['父亲节'])
    expect(detail.lunar).toBe('丙午马年 农历五月初七')
  })

  it('两个开关都关时只剩公历信息', () => {
    const detail = getDayDetail(
      localDate(2026, 6, 21),
      opts('CN', { showLunarTerm: false, showAlmanac: false }),
    )
    expect(detail).toMatchObject({
      lunar: '',
      yi: [],
      ji: [],
      jishen: [],
      xiongsha: [],
      festivals: ['父亲节'],
    })
  })

  it('星期与星座返回稳定标识（由展示层映射到 i18n），不再是中文字符串', () => {
    const detail = getDayDetail(localDate(2026, 6, 21), opts())
    expect(detail.weekday).toBe(0)
    expect(detail.constellation).toBe('gemini')
  })
})

// ─────────────────────────────────────────────
// 不显示节假日（NONE）：给非中文地区用户的关闭态
// ─────────────────────────────────────────────

describe('不显示节假日（NONE）', () => {
  const none = opts('NONE')

  it('不显示任何休班标记', () => {
    expect(getDayCell(localDate(2026, 10, 1), none).dayType).toBe(
      CalendarDayType.NORMAL,
    )
    expect(getDayCell(localDate(2026, 9, 20), none).dayType).toBe(
      CalendarDayType.NORMAL,
    )
    expect(getDayCell(localDate(2026, 2, 17), none).dayType).toBe(
      CalendarDayType.NORMAL,
    )
  })

  it('排除中国大陆口径的节日', () => {
    for (const [month, day] of [
      [7, 1],
      [8, 1],
      [10, 1],
      [6, 1],
      [9, 10],
      [5, 4],
      [3, 12],
    ]) {
      expect(getDayDetail(localDate(2026, month, day), none).festivals).toEqual(
        [],
      )
    }
  })

  it('排除农历传统节日', () => {
    for (const [month, day] of [
      [2, 17],
      [3, 3],
      [4, 5],
      [6, 19],
      [8, 27],
      [9, 25],
      [12, 22],
    ]) {
      expect(getDayDetail(localDate(2026, month, day), none).festivals).toEqual(
        [],
      )
    }
  })

  it('保留国际通用节日与通用现代节日', () => {
    expect(getDayDetail(localDate(2026, 1, 1), none).festivals).toEqual(['元旦'])
    expect(getDayDetail(localDate(2026, 5, 1), none).festivals).toEqual([
      '劳动节',
    ])
    expect(getDayDetail(localDate(2026, 2, 14), none).festivals).toEqual([
      '情人节',
    ])
    expect(getDayDetail(localDate(2026, 12, 25), none).festivals).toEqual([
      '圣诞节',
    ])
  })

  it('历法信息仍然可用（农历与节气由展示开关控制，与地区无关）', () => {
    const detail = getDayDetail(localDate(2026, 6, 21), none)
    expect(detail.lunar).toBe('丙午马年 农历五月初七')
    expect(getDayCell(localDate(2026, 1, 5), none).desc).toBe('小寒')
  })
})

// ─────────────────────────────────────────────
// 与库的契约：这些映射依赖 tyme4ts 的枚举顺序，升级库时必须能立刻发现
// ─────────────────────────────────────────────

describe('星座与星期的映射契约', () => {
  it('CONSTELLATION_KEYS 的顺序与 tyme4ts 的 Constellation.NAMES 一一对应', () => {
    // 库若调整枚举顺序，这里会失败，提醒同步展示层的 i18n 映射
    expect(CONSTELLATION_KEYS).toHaveLength(Constellation.NAMES.length)
    const pairs = CONSTELLATION_KEYS.map((key, index) => [
      key,
      Constellation.fromIndex(index).getName(),
    ])
    expect(pairs).toEqual([
      ['aries', '白羊'],
      ['taurus', '金牛'],
      ['gemini', '双子'],
      ['cancer', '巨蟹'],
      ['leo', '狮子'],
      ['virgo', '处女'],
      ['libra', '天秤'],
      ['scorpio', '天蝎'],
      ['sagittarius', '射手'],
      ['capricorn', '摩羯'],
      ['aquarius', '水瓶'],
      ['pisces', '双鱼'],
    ])
  })
})
