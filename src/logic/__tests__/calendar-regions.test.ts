import { describe, it, expect } from 'vitest'
import { CONSTELLATION_KEYS } from '@/logic/calendar'
import {
  REGION_CODES,
  getRegionEntry,
  getRegionFallback,
  isRegionCode,
  resolveRegionCode,
} from '@/logic/calendar/regions'
import {
  resolveFestivalRules,
  toDateKey,
} from '@/logic/calendar/regions/rules'
import { validateRegionData } from '@/logic/calendar/regions/validate'
import type { IRegionFestival } from '@/logic/calendar/regions/types'

describe('地区注册表', () => {
  it('地区代码遵循 ISO 3166-1 alpha-2，顺序即下拉框顺序', () => {
    expect(REGION_CODES).toEqual(['NONE', 'CN', 'HK', 'TW'])
  })

  it('CN 完全使用日历库数据，TW / HK 使用数据文件', () => {
    expect(getRegionFallback('CN')).toBe('library')
    expect(getRegionEntry('CN').data).toBeUndefined()
    expect(getRegionFallback('TW')).toBe('none')
    expect(getRegionEntry('TW').data?.scheme).toBe(
      'government-office-calendar',
    )
    expect(getRegionEntry('HK').data?.scheme).toBe('general-holidays')
  })

  it('NONE 是「不显示节假日」的关闭态，带一份排除清单', () => {
    expect(getRegionFallback('NONE')).toBe('none')
    expect(getRegionEntry('NONE').data?.scheme).toBe('none')
    expect(getRegionEntry('NONE').data?.exclude).toContain('建党节')
    expect(getRegionEntry('NONE').data?.exclude).toContain('春节')
  })

  it('isRegionCode 做运行时校验（配置可能来自更高版本的设备）', () => {
    expect(isRegionCode('TW')).toBe(true)
    expect(isRegionCode('MO')).toBe(false)
    expect(isRegionCode('__proto__')).toBe(false)
  })
})

describe('节日规则解析', () => {
  const festivals: IRegionFestival[] = [
    { name: '雙十節', rule: { type: 'solarDay', month: 10, day: 10 } },
    {
      name: '母親節',
      rule: { type: 'solarWeek', month: 5, index: 2, week: 'sun' },
    },
    { name: '佛誕', rule: { type: 'lunarDay', month: 4, day: 8 } },
    { name: '寒食節', rule: { type: 'termDay', term: '清明', offset: -1 } },
    {
      name: '重陽節翌日',
      rule: { type: 'lunarDay', month: 9, day: 9, offset: 1 },
    },
  ]

  it('四种规则类型都能解析到正确日期', () => {
    const map = resolveFestivalRules(festivals, 2026)
    expect(map.get('2026-10-10')).toEqual(['雙十節'])
    expect(map.get('2026-05-10')).toEqual(['母親節'])
    expect(map.get('2026-05-24')).toEqual(['佛誕'])
    expect(map.get('2026-04-04')).toEqual(['寒食節'])
    expect(map.get('2026-10-18')).toEqual(['重陽節翌日'])
  })

  it('星期规则跨年正确（5 月第 2 个周日）', () => {
    expect(resolveFestivalRules(festivals, 2027).get('2027-05-09')).toEqual([
      '母親節',
    ])
  })

  it('无节日时返回空表', () => {
    expect(resolveFestivalRules([], 2026).size).toBe(0)
  })

  it('toDateKey 补零', () => {
    expect(toDateKey(2026, 1, 5)).toBe('2026-01-05')
  })
})

describe('地区数据校验', () => {
  /** 一份合法数据，各用例在此基础上制造错误 */
  const validData = {
    region: 'TW',
    scheme: 'government-office-calendar',
    exclude: ['建党节'],
    add: [],
    years: {},
  }

  const validYear = {
    source: '行政院人事行政總處 2026 年政府行政機關辦公日曆表',
    sourceUrl: 'https://example.gov.tw/',
    verifiedAt: '2026-01-10',
    rest: [{ date: '2026-02-28', name: '和平紀念日' }],
    work: ['2026-02-14'],
  }

  it('合法数据无错误', () => {
    expect(validateRegionData(validData, 'tw.json')).toEqual([])
  })

  it('发现同一天既休又班（最危险的一类错误）', () => {
    const errors = validateRegionData(
      {
        ...validData,
        years: { 2026: { ...validYear, work: ['2026-02-28'] } },
      },
      'tw.json',
    )
    expect(errors.join('\n')).toContain('同时出现在 rest 与 work')
  })

  it('发现不存在的日期与重复日期', () => {
    const errors = validateRegionData(
      {
        ...validData,
        years: {
          2026: {
            ...validYear,
            rest: [
              { date: '2026-02-30' },
              { date: '2026-02-28' },
              { date: '2026-02-28' },
            ],
          },
        },
      },
      'tw.json',
    )
    const joined = errors.join('\n')
    expect(joined).toContain('非法日期')
    expect(joined).toContain('rest 重复')
  })

  it('发现缺失来源与核对日期', () => {
    const errors = validateRegionData(
      {
        ...validData,
        years: {
          2026: { ...validYear, source: '', verifiedAt: '2026/01/10' },
        },
      },
      'tw.json',
    )
    const joined = errors.join('\n')
    expect(joined).toContain('缺少 source')
    expect(joined).toContain('verifiedAt')
  })

  it('发现日期不属于该年份', () => {
    const errors = validateRegionData(
      {
        ...validData,
        years: { 2026: { ...validYear, work: ['2027-02-14'] } },
      },
      'tw.json',
    )
    expect(errors.join('\n')).toContain('不属于该年')
  })

  it('发现年份空洞', () => {
    const errors = validateRegionData(
      {
        ...validData,
        years: { 2024: validYear, 2026: validYear },
      },
      'tw.json',
    )
    expect(errors.join('\n')).toContain('年份不连续')
  })

  it('发现 exclude 里不存在的节日名（日历库改名后会触发）', () => {
    const errors = validateRegionData(
      { ...validData, exclude: ['不存在的节日'] },
      'tw.json',
    )
    expect(errors.join('\n')).toContain('不存在于 tyme4ts 内置表')
  })

  it('发现 add 与内置节日重名', () => {
    const errors = validateRegionData(
      {
        ...validData,
        add: [
          { name: '国庆节', rule: { type: 'solarDay', month: 10, day: 1 } },
        ],
      },
      'tw.json',
    )
    expect(errors.join('\n')).toContain('无需重复声明')
  })

  it('发现非法规则参数', () => {
    const errors = validateRegionData(
      {
        ...validData,
        add: [
          { name: '测试节', rule: { type: 'solarWeek', month: 13, index: 0, week: 'sun' } },
        ],
      },
      'tw.json',
    )
    const joined = errors.join('\n')
    expect(joined).toContain('month 越界')
    expect(joined).toContain('index 只能是')
  })

  it('发现 region 与文件名不一致', () => {
    const errors = validateRegionData(validData, 'hk.json')
    expect(errors.join('\n')).toContain('与文件名')
  })

  it('根节点不是对象时直接报错', () => {
    expect(validateRegionData(null, 'tw.json')).toHaveLength(1)
    expect(validateRegionData([], 'tw.json')).toHaveLength(1)
  })
})

describe('地区代码归一化', () => {
  it('resolveRegionCode 把非法值收敛到默认地区', () => {
    expect(resolveRegionCode('TW')).toBe('TW')
    expect(resolveRegionCode('MO')).toBe('CN')
    expect(resolveRegionCode('')).toBe('CN')
  })
})
