import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  CUSTOM_SUBSCRIPTION,
  SUBSCRIPTION_CACHE_TTL,
  SUBSCRIPTION_REGIONS,
  fetchSubscription,
  getSubscriptionUrl,
  isMainlandSubscription,
  isValidSubscriptionUrl,
  loadSubscription,
  readSubscriptionCache,
  readSubscriptionFetchedAt,
  resolveSubscriptionRegion,
  subscriptionState,
  writeSubscriptionCache,
} from '@/logic/calendar/subscriptions'
import type { ISubscriptionCache } from '@/logic/calendar/subscriptions'

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260101
DTEND;VALUE=DATE:20260104
SUMMARY:元旦（休）
X-APPLE-SPECIAL-DAY:WORK-HOLIDAY
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260104
SUMMARY:元旦（班）
X-APPLE-SPECIAL-DAY:ALTERNATE-WORKDAY
END:VEVENT
END:VCALENDAR`

const URL_CN = 'https://example.com/cn.ics'

const mockFetch = (impl: () => Promise<unknown>) => {
  const spy = vi.fn(impl)
  vi.stubGlobal('fetch', spy)
  return spy
}

const okResponse = (text: string, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => text,
})

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  subscriptionState.url = ''
  subscriptionState.status = 'idle'
  subscriptionState.days = {}
  subscriptionState.error = null
  subscriptionState.isRefreshing = false
})

afterEach(() => {
  vi.useRealTimers()
})

describe('预设订阅', () => {
  it('地区列表与 Apple 日历对齐且 URL 唯一', () => {
    expect(SUBSCRIPTION_REGIONS.length).toBe(46)

    const urls = SUBSCRIPTION_REGIONS.map((region) =>
      getSubscriptionUrl(region),
    )
    expect(new Set(urls).size).toBe(urls.length)

    for (const url of urls) {
      expect(url).toMatch(
        /^https:\/\/calendars\.icloud\.com\/holidays\/[a-z0-9_-]+\.ics$/,
      )
    }
  })

  it('中国大陆、美国、台湾的地址符合实测结果', () => {
    expect(getSubscriptionUrl('CN')).toBe(
      'https://calendars.icloud.com/holidays/cn_zh.ics',
    )
    expect(getSubscriptionUrl('US')).toBe(
      'https://calendars.icloud.com/holidays/us_en-us.ics',
    )
    expect(getSubscriptionUrl('TW')).toBe(
      'https://calendars.icloud.com/holidays/tw_zh.ics',
    )
  })

  it('非法地区不生成 /undefined.ics', () => {
    expect(getSubscriptionUrl('XX' as never)).toBe('')
    expect(resolveSubscriptionRegion('XX')).toBe('CN')
    expect(resolveSubscriptionRegion('TW')).toBe('TW')
    expect(resolveSubscriptionRegion(undefined)).toBe('CN')
  })
})

describe('通用节日表的启用条件', () => {
  it('只有中国大陆订阅启用', () => {
    expect(isMainlandSubscription('CN')).toBe(true)
    expect(isMainlandSubscription('HK')).toBe(false)
    expect(isMainlandSubscription('TW')).toBe(false)
    expect(isMainlandSubscription('US')).toBe(false)
    expect(isMainlandSubscription(CUSTOM_SUBSCRIPTION)).toBe(false)
    expect(isMainlandSubscription('')).toBe(false)
    // 非法值会回退到 CN，节日表与回退后的订阅保持一致
    expect(isMainlandSubscription('XX')).toBe(true)
  })
})

describe('地址校验', () => {
  it('只接受 http(s) 绝对地址', () => {
    expect(isValidSubscriptionUrl('https://example.com/a.ics')).toBe(true)
    expect(isValidSubscriptionUrl('http://example.com/a.ics')).toBe(true)
    expect(isValidSubscriptionUrl('ftp://example.com/a.ics')).toBe(false)
    expect(isValidSubscriptionUrl('not a url')).toBe(false)
    expect(isValidSubscriptionUrl('')).toBe(false)
  })
})

describe('缓存', () => {
  const cache: ISubscriptionCache = {
    url: URL_CN,
    fetchedAt: 1_000_000,
    days: { '2026-01-01': { names: ['元旦'], mark: 'REST', termNames: [] } },
  }

  it('写入后能读回', () => {
    writeSubscriptionCache(cache)
    expect(readSubscriptionCache(URL_CN, cache.fetchedAt + 1)).toEqual(cache)
  })

  it('超过 TTL 视为过期', () => {
    writeSubscriptionCache(cache)
    expect(
      readSubscriptionCache(URL_CN, cache.fetchedAt + SUBSCRIPTION_CACHE_TTL),
    ).toEqual(cache)
    expect(
      readSubscriptionCache(
        URL_CN,
        cache.fetchedAt + SUBSCRIPTION_CACHE_TTL + 1,
      ),
    ).toBeNull()
  })

  it('URL 不匹配、内容损坏都返回 null', () => {
    writeSubscriptionCache(cache)
    expect(readSubscriptionCache('https://example.com/other.ics')).toBeNull()

    localStorage.setItem('naivetab:calendar:subscription:' + URL_CN, '{broken')
    expect(readSubscriptionCache(URL_CN)).toBeNull()
  })

  it('旧版本缓存（isTerm 版本）自动失效，不被当成新格式使用', () => {
    localStorage.setItem(
      'naivetab:calendar:subscription:' + URL_CN,
      JSON.stringify({
        url: URL_CN,
        fetchedAt: Date.now(),
        days: { '2026-01-01': { names: ['元旦'], isTerm: false } },
      }),
    )
    expect(readSubscriptionCache(URL_CN)).toBeNull()
  })

  it('版本正确但条目结构损坏时也返回 null', () => {
    localStorage.setItem(
      'naivetab:calendar:subscription:' + URL_CN,
      JSON.stringify({
        version: 2,
        url: URL_CN,
        fetchedAt: Date.now(),
        days: { '2026-01-01': { names: '元旦', termNames: [] } },
      }),
    )
    expect(readSubscriptionCache(URL_CN)).toBeNull()
  })

  it('写入新订阅时清掉其它订阅的缓存（只保留当前一个）', () => {
    const other = 'https://example.com/other.ics'
    writeSubscriptionCache({ ...cache, url: URL_CN })
    writeSubscriptionCache({ ...cache, url: other, fetchedAt: 2_000_000 })

    expect(readSubscriptionCache(URL_CN, 2_000_001)).toBeNull()
    expect(readSubscriptionCache(other, 2_000_001)).not.toBeNull()
  })
})

describe('fetchSubscription：错误映射', () => {
  it('URL 不合法', async () => {
    await expect(fetchSubscription('nope')).rejects.toMatchObject({
      subscriptionError: { code: 'invalid-url' },
    })
  })

  it('HTTP 错误（例如 Cloudflare 的 403）', async () => {
    mockFetch(async () => okResponse('<html>Just a moment...</html>', 403))
    await expect(fetchSubscription(URL_CN)).rejects.toMatchObject({
      subscriptionError: { code: 'http', status: 403 },
    })
  })

  it('返回 HTML 而不是日历', async () => {
    mockFetch(async () => okResponse('<html><body>hi</body></html>'))
    await expect(fetchSubscription(URL_CN)).rejects.toMatchObject({
      subscriptionError: { code: 'not-calendar' },
    })
  })

  it('是日历但没有任何事件', async () => {
    mockFetch(async () =>
      okResponse('BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'),
    )
    await expect(fetchSubscription(URL_CN)).rejects.toMatchObject({
      subscriptionError: { code: 'not-calendar' },
    })
  })

  it('网络异常', async () => {
    mockFetch(async () => {
      throw new Error('offline')
    })
    await expect(fetchSubscription(URL_CN)).rejects.toMatchObject({
      subscriptionError: { code: 'network' },
    })
  })

  it('超大响应直接拒绝，避免拖死新标签页', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': String(6 * 1024 * 1024) }),
      text: async () => '',
    }))
    await expect(fetchSubscription(URL_CN)).rejects.toMatchObject({
      subscriptionError: { code: 'too-large' },
    })
  })
})

describe('fetchSubscription：正常解析', () => {
  it('解析出休/班并写入缓存', async () => {
    mockFetch(async () => okResponse(SAMPLE_ICS))

    const result = await fetchSubscription(URL_CN, {
      fromYear: 2026,
      toYear: 2026,
    })

    expect(result.days['2026-01-01']).toMatchObject({ mark: 'REST' })
    expect(result.days['2026-01-02']).toMatchObject({ mark: 'REST' })
    expect(result.days['2026-01-04']).toMatchObject({ mark: 'WORK' })
    expect(result.days['2026-01-05']).toBeUndefined()
  })
})

describe('fetchSubscription：解析窗口', () => {
  it('覆盖源里实际出现的年份，不被固定“今年 ±2”截掉', async () => {
    const currentYear = new Date().getFullYear()
    const pastYear = currentYear - 3
    const futureYear = currentYear + 4
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:${pastYear}0101
SUMMARY:Past Holiday
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:${futureYear}0101
SUMMARY:Future Holiday
END:VEVENT
END:VCALENDAR`
    mockFetch(async () => okResponse(ics))

    const result = await fetchSubscription(URL_CN)

    expect(result.days[`${pastYear}-01-01`]).toBeDefined()
    expect(result.days[`${futureYear}-01-01`]).toBeDefined()
  })
})

describe('loadSubscription：缓存优先', () => {
  it('有缓存时直接可用，不再发请求', async () => {
    writeSubscriptionCache({
      url: URL_CN,
      fetchedAt: Date.now(),
      days: { '2026-01-01': { names: ['元旦'], mark: 'REST', termNames: [] } },
    })
    const spy = mockFetch(async () => okResponse(SAMPLE_ICS))

    await loadSubscription(URL_CN)

    expect(spy).not.toHaveBeenCalled()
    expect(subscriptionState.status).toBe('ready')
    expect(subscriptionState.days['2026-01-01']).toBeDefined()
  })

  it('force 刷新不会被正在进行的普通加载吞掉', async () => {
    const resolvers: Array<(value: unknown) => void> = []
    const spy = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve as (value: unknown) => void)
        }),
    )
    vi.stubGlobal('fetch', spy)

    // 无缓存：第一次是普通加载（会发请求），第二次是强制刷新
    const first = loadSubscription(URL_CN)
    const second = loadSubscription(URL_CN, { force: true })

    expect(spy).toHaveBeenCalledTimes(2)

    for (const resolve of resolvers) resolve(okResponse(SAMPLE_ICS))
    await Promise.all([first, second])
  })

  it('force 时忽略缓存重新拉取', async () => {
    writeSubscriptionCache({
      url: URL_CN,
      fetchedAt: Date.now(),
      days: { '2025-01-01': { names: ['旧数据'], termNames: [] } },
    })
    const spy = mockFetch(async () => okResponse(SAMPLE_ICS))

    await loadSubscription(URL_CN, {
      force: true,
      fromYear: 2026,
      toYear: 2026,
    })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(subscriptionState.days['2026-01-01']).toBeDefined()
    expect(subscriptionState.days['2025-01-01']).toBeUndefined()
  })

  it('强制刷新期间保留旧数据，不把日历清空', async () => {
    writeSubscriptionCache({
      url: URL_CN,
      fetchedAt: Date.now(),
      days: { '2026-01-01': { names: ['元旦'], mark: 'REST', termNames: [] } },
    })
    let resolveFetch: ((value: unknown) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve
          }),
      ),
    )

    const task = loadSubscription(URL_CN, { force: true })
    expect(subscriptionState.status).toBe('ready')
    expect(subscriptionState.isRefreshing).toBe(true)
    expect(subscriptionState.days['2026-01-01']).toBeDefined()

    resolveFetch?.(okResponse(SAMPLE_ICS))
    await task
    expect(subscriptionState.isRefreshing).toBe(false)
    expect(subscriptionState.days['2026-01-01']).toBeDefined()
  })

  it('旧 URL 的慢请求不会覆盖新订阅', async () => {
    const urlA = 'https://example.com/a.ics'
    const urlB = 'https://example.com/b.ics'
    const pending = new Map<string, (value: unknown) => void>()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (url: string) =>
          new Promise((resolve) => {
            pending.set(url, resolve)
          }),
      ),
    )

    const taskA = loadSubscription(urlA)
    const taskB = loadSubscription(urlB)

    // B 先返回，A 后返回：最终必须是 B
    pending.get(urlB)?.(okResponse(SAMPLE_ICS))
    await taskB
    pending.get(urlA)?.(okResponse(SAMPLE_ICS))
    await taskA

    expect(subscriptionState.url).toBe(urlB)
    expect(subscriptionState.status).toBe('ready')
  })

  it('被作废的 in-flight 任务不会被再次复用', async () => {
    const resolvers: Array<(value: unknown) => void> = []
    const spy = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve as (value: unknown) => void)
        }),
    )
    vi.stubGlobal('fetch', spy)

    const first = loadSubscription(URL_CN)
    // 清空订阅会作废第一次加载；随后重新请求同一 URL 必须重新发请求
    await loadSubscription('')
    const second = loadSubscription(URL_CN)

    expect(spy).toHaveBeenCalledTimes(2)

    resolvers[0]?.(okResponse('<html>stale</html>', 403))
    resolvers[1]?.(okResponse(SAMPLE_ICS))
    await Promise.all([first, second])

    expect(subscriptionState.status).toBe('ready')
    expect(subscriptionState.days['2026-01-01']).toBeDefined()
  })

  it('无缓存且拉取成功 → ready', async () => {
    mockFetch(async () => okResponse(SAMPLE_ICS))
    await loadSubscription(URL_CN, { fromYear: 2026, toYear: 2026 })

    expect(subscriptionState.status).toBe('ready')
    expect(subscriptionState.error).toBeNull()
  })

  it('拉取失败但有旧缓存 → 继续展示并记录错误', async () => {
    writeSubscriptionCache({
      url: URL_CN,
      fetchedAt: Date.now() - SUBSCRIPTION_CACHE_TTL - 1, // 已过期
      days: { '2026-01-01': { names: ['元旦'], mark: 'REST', termNames: [] } },
    })
    mockFetch(async () => okResponse('<html>403</html>', 403))

    await loadSubscription(URL_CN)

    expect(subscriptionState.status).toBe('ready')
    expect(subscriptionState.days['2026-01-01']).toBeDefined()
    expect(subscriptionState.error).toMatchObject({ code: 'http', status: 403 })
  })

  it('拉取失败且无缓存 → 保持 loading 且带错误', async () => {
    mockFetch(async () => {
      throw new Error('offline')
    })

    await loadSubscription(URL_CN)

    expect(subscriptionState.status).toBe('loading')
    expect(subscriptionState.days).toEqual({})
    expect(subscriptionState.error).toMatchObject({ code: 'network' })
  })

  it('空地址回到 idle', async () => {
    subscriptionState.status = 'ready'
    await loadSubscription('')
    expect(subscriptionState.status).toBe('idle')
    expect(subscriptionState.url).toBe('')
  })
})

describe('readSubscriptionFetchedAt', () => {
  it('缓存过期后仍能读到时间戳（设置面板展示「上次更新」用）', () => {
    const fetchedAt = Date.now() - SUBSCRIPTION_CACHE_TTL - 60_000
    writeSubscriptionCache({
      url: URL_CN,
      fetchedAt,
      days: { '2026-01-01': { names: ['元旦'], mark: 'REST', termNames: [] } },
    })

    expect(readSubscriptionCache(URL_CN)).toBeNull()
    expect(readSubscriptionFetchedAt(URL_CN)).toBe(fetchedAt)
  })

  it('没有缓存时返回 0', () => {
    expect(readSubscriptionFetchedAt('https://example.com/none.ics')).toBe(0)
  })
})
