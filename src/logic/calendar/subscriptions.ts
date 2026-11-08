/**
 * @module calendar/subscriptions
 * @description 节假日订阅：预设地区（对齐 Apple 日历的节假日日历）+ 自定义地址，
 * 负责拉取、校验、解析与本地缓存。
 *
 * 设计要点：
 *   - 运行时只认「一个」订阅（与 Apple 日历的使用心智一致），缓存按 URL 存；
 *     将来要支持多个，需要同时改 UI 与“只保留当前订阅”的缓存清理
 *   - 首屏不等网络：有缓存就先渲染，再按 TTL 后台刷新；没有缓存才会进入 loading
 *   - 刷新期间保留旧数据：过期缓存或内存数据会先展示，失败也不清空
 *   - 失败不清空已有缓存：宁可显示旧数据（并标记），也不让日历突然空掉
 *   - 不同 URL / force 的并发加载有 token 保护，旧请求晚返回不会覆盖新订阅
 */
import {
  getCalendarYearRange,
  looksLikeCalendar,
  parseCalendar,
} from './ics/parse'
import type { IIcsDayEntry } from './ics/parse'

/** Apple 节假日日历的地址前缀 */
const APPLE_CALENDAR_BASE = 'https://calendars.icloud.com/holidays'

/**
 * 预设地区（ISO 3166-1 alpha-2）。数组顺序只为人眼核对，不参与任何逻辑——
 * 下拉里的顺序由 createRegionLabelComparator 按当前语言实时排。
 *
 * 全部实测可达（2026-11 验证），澳门、阿根廷 Apple 未提供。
 *
 * 产品决定：不提供「不订阅 / 不显示节假日」的选项。
 * 未选择自定义地址（或地址为空）时，loadSubscription('') 会回到 idle，不发请求。
 */
export const SUBSCRIPTION_REGIONS = [
  // 中国及周边
  'CN',
  'HK',
  'TW',
  'JP',
  'KR',
  'SG',
  'MY',
  'TH',
  'VN',
  'ID',
  'PH',
  'IN',
  // 美洲
  'US',
  'CA',
  'MX',
  'BR',
  'CL',
  'CO',
  // 欧洲
  'GB',
  'IE',
  'FR',
  'DE',
  'AT',
  'CH',
  'BE',
  'NL',
  'PT',
  'ES',
  'IT',
  'GR',
  'PL',
  'CZ',
  'HU',
  'RO',
  'UA',
  'RU',
  // 中东与非洲
  'TR',
  'IL',
  'AE',
  'ZA',
  // 大洋洲与北欧
  'AU',
  'NZ',
  'SE',
  'NO',
  'DK',
  'FI',
] as const

export type TSubscriptionRegion = (typeof SUBSCRIPTION_REGIONS)[number]

/**
 * 地区名比较器：按当前语言的字母序（中文下即拼音序）。
 *
 * 为什么不写死顺序：界面语言切换后，用户只会用自己语言的名字去找。
 * 中文界面里「德国」若待在 G 段（按 Germany 排），用户根本定位不到；
 * 按拼音排它就在 D 段。
 */
export const createRegionLabelComparator = (
  locale: string,
): ((a: string, b: string) => number) => {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' })
  return (a, b) => collator.compare(a, b)
}

/**
 * 下拉里固定置顶的地区：中国大陆、中国香港、中国台湾。
 * 产品默认地区是 CN，且这三项是中文用户最高频的选择，不该让人滚字母表去找。
 */
export const PINNED_SUBSCRIPTION_REGIONS: readonly TSubscriptionRegion[] = [
  'CN',
  'HK',
  'TW',
]

/**
 * 下拉候选顺序：置顶三项（按 PINNED_SUBSCRIPTION_REGIONS 的顺序）在前，
 * 其余按传入的比较器排。
 *
 * labelOf / compare 由调用方注入——logic 层不依赖 i18n 与 Intl.DisplayNames，
 * 排序规则本身也因此可测。
 */
export const orderSubscriptionRegions = (
  labelOf: (region: TSubscriptionRegion) => string,
  compare: (a: string, b: string) => number,
): TSubscriptionRegion[] => {
  const pinned = new Set<TSubscriptionRegion>(PINNED_SUBSCRIPTION_REGIONS)
  const rest = SUBSCRIPTION_REGIONS.filter((region) => !pinned.has(region))
  rest.sort((a, b) => compare(labelOf(a), labelOf(b)))
  return [...PINNED_SUBSCRIPTION_REGIONS, ...rest]
}

/** 地区 → Apple 日历 slug */
const APPLE_SLUGS: Record<TSubscriptionRegion, string> = {
  CN: 'cn_zh',
  HK: 'hk_zh',
  TW: 'tw_zh',
  JP: 'jp_ja',
  KR: 'kr_ko',
  SG: 'sg_en',
  MY: 'my_en',
  TH: 'th_th',
  VN: 'vn_vi',
  ID: 'id_id',
  PH: 'ph_en',
  IN: 'in_en',
  US: 'us_en-us',
  CA: 'ca_en',
  MX: 'mx_es',
  BR: 'br_pt',
  CL: 'cl_es-cl',
  CO: 'co_es',
  GB: 'gb_en-gb',
  IE: 'ie_en-ie',
  FR: 'fr_fr',
  DE: 'de_de',
  AT: 'at_de-at',
  CH: 'ch_de-ch',
  BE: 'be_nl-be',
  NL: 'nl_nl',
  PT: 'pt_pt',
  ES: 'es_es',
  IT: 'it_it',
  GR: 'gr_el',
  PL: 'pl_pl',
  CZ: 'cz_cs',
  HU: 'hu_hu',
  RO: 'ro_ro',
  UA: 'ua_uk',
  RU: 'ru_ru',
  TR: 'tr_tr',
  IL: 'il_he',
  AE: 'ae_ar',
  ZA: 'za_en-za',
  AU: 'au_en-au',
  NZ: 'nz_en',
  SE: 'se_sv',
  NO: 'no_nb',
  DK: 'dk_da',
  FI: 'fi_fi',
}

/** 自定义订阅的 id（与地区代码区分开） */
export const CUSTOM_SUBSCRIPTION = 'custom'

/** 运行时配置可能来自云同步/旧开发版，不能直接相信字符串是合法地区 */
export const isSubscriptionRegion = (
  value: unknown,
): value is TSubscriptionRegion =>
  typeof value === 'string' &&
  (SUBSCRIPTION_REGIONS as readonly string[]).includes(value)

/** 非法地区回退到默认地区，避免生成 /undefined.ics */
export const resolveSubscriptionRegion = (
  value: unknown,
): TSubscriptionRegion => (isSubscriptionRegion(value) ? value : 'CN')

/**
 * 通用节日表（festivals.ts）只有中文名称，且条目多为大陆常用节日，
 * 因此只在订阅中国大陆时补充；自定义地址、非法回退到 CN 时都按回退后的地区判断。
 */
export const isMainlandSubscription = (region: string): boolean =>
  region !== '' &&
  region !== CUSTOM_SUBSCRIPTION &&
  resolveSubscriptionRegion(region) === 'CN'

/**
 * 取预设地区的订阅地址。
 *
 * 参数类型已保证是合法地区，正常路径不会返回空串；末尾的空串分支只为
 * 「运行时拿到被写坏的配置」兜底（测试用 `'XX' as never` 覆盖），
 * 调用方**不需要**再判空。真正可能为空的是自定义地址，那条路径不经过这里。
 */
export const getSubscriptionUrl = (region: TSubscriptionRegion): string => {
  const slug = APPLE_SLUGS[region] as string | undefined
  return slug ? `${APPLE_CALENDAR_BASE}/${slug}.ics` : ''
}

/** 订阅加载失败的原因 */
export type TSubscriptionError =
  | { code: 'invalid-url' }
  | { code: 'network' }
  | { code: 'http'; status: number }
  | { code: 'not-calendar' }
  | { code: 'too-large' }
  | { code: 'empty' }

/** 缓存结构与有效期（24 小时）——节假日数据一年只变几次，没必要更频繁 */
export interface ISubscriptionCache {
  url: string
  fetchedAt: number
  days: Record<string, IIcsDayEntry>
}

/** 缓存结构版本：IIcsDayEntry 从 isTerm 改为 termNames 后，旧缓存必须失效 */
const SUBSCRIPTION_CACHE_VERSION = 2

interface IStoredSubscriptionCache extends ISubscriptionCache {
  version: number
}

export const SUBSCRIPTION_CACHE_TTL = 24 * 60 * 60 * 1000

const CACHE_KEY_PREFIX = 'naivetab:calendar:subscription:'
const cacheKey = (url: string): string => `${CACHE_KEY_PREFIX}${url}`
const FETCH_TIMEOUT = 10_000

/**
 * 「同一天内不重复提示」的标记：最近一次向用户提示过订阅失败的本地自然日。
 *
 * 用 localStorage 而不是模块变量 —— 新标签页是新的执行上下文，模块变量存不住，
 * 而这里要抑制的恰恰是「每开一个标签页就提示一次」。
 *
 * 键名刻意**不带** CACHE_KEY_PREFIX：writeSubscriptionCache 会删掉所有同前缀的其他键。
 */
const ERROR_PROMPT_KEY = 'naivetab:calendar:error-prompt-day'

/** 本地自然日键（YYYY-MM-DD），用于判断「是不是同一天」 */
const toLocalDayKey = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/**
 * 本次失败是否需要提示给用户。
 *
 * 自动刷新失败：同一自然日只提示第一次——节假日数据一年只变几次，
 * 网络不稳时每天弹一次警告图标的打扰远大于收益。
 * 用户主动重试（force）失败：总是提示，那是他自己要求的动作。
 *
 * 只影响「提示」，不影响重试：后续挂载仍会正常发起请求，成功即自愈。
 */
const shouldPromptError = (force: boolean): boolean => {
  const today = toLocalDayKey()
  let alreadyPrompted: boolean
  try {
    alreadyPrompted = localStorage.getItem(ERROR_PROMPT_KEY) === today
    // force 也要占掉当天的名额，否则用户点一次重试后，当天后续自动失败又会提示
    if (!alreadyPrompted) localStorage.setItem(ERROR_PROMPT_KEY, today)
  } catch {
    // 隐私模式/容量不足：退化成每次都提示
    return true
  }
  return force || !alreadyPrompted
}

/**
 * 自定义地址可能指向超大文件。节假日源通常只有几十 KB，
 * 这里设一个宽松上限，避免异常/恶意响应把新标签页的解析线程拖死。
 */
const MAX_ICS_BYTES = 5 * 1024 * 1024

/**
 * 缓存条目的最小结构校验：损坏/旧格式不应让适配层拿到半截数据。
 *
 * 全量遍历（订阅展开后条目可达千级）。单次加载会读两次缓存（新鲜命中 + 过期兜底），
 * 设置面板还会为「上次更新」再读一次，等于每次开面板校验三遍。
 * 单条只是几次类型判断，实测可忽略；若要再省，应先合并这三次读取，
 * 而不是削弱校验——坏缓存会直接让格子读到 undefined。
 */
const isValidDayEntry = (entry: unknown): entry is IIcsDayEntry => {
  if (!entry || typeof entry !== 'object') return false
  const candidate = entry as Partial<IIcsDayEntry>
  if (!Array.isArray(candidate.names) || !Array.isArray(candidate.termNames))
    return false
  if (
    !candidate.names.every((name) => typeof name === 'string') ||
    !candidate.termNames.every((name) => typeof name === 'string')
  ) {
    return false
  }
  return (
    candidate.mark === undefined ||
    candidate.mark === 'REST' ||
    candidate.mark === 'WORK'
  )
}

/** 校验并读取缓存（缓存损坏、版本过旧或格式不符时返回 null） */
export const readSubscriptionCache = (
  url: string,
  now = Date.now(),
): ISubscriptionCache | null => {
  try {
    const raw = localStorage.getItem(cacheKey(url))
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const cache = parsed as Partial<IStoredSubscriptionCache>
    if (cache.version !== SUBSCRIPTION_CACHE_VERSION) return null
    if (cache.url !== url || typeof cache.fetchedAt !== 'number') return null
    if (
      !cache.days ||
      typeof cache.days !== 'object' ||
      Array.isArray(cache.days)
    )
      return null
    if (!Object.values(cache.days).every(isValidDayEntry)) return null
    if (now - cache.fetchedAt > SUBSCRIPTION_CACHE_TTL) return null

    // 不把内部 version 字段泄漏给调用方，保持 ISubscriptionCache 结构稳定
    return {
      url: cache.url,
      fetchedAt: cache.fetchedAt,
      days: cache.days,
    }
  } catch {
    return null
  }
}

export const writeSubscriptionCache = (cache: ISubscriptionCache): void => {
  try {
    const stored: IStoredSubscriptionCache = {
      version: SUBSCRIPTION_CACHE_VERSION,
      ...cache,
    }
    localStorage.setItem(cacheKey(cache.url), JSON.stringify(stored))
    // 只保留当前订阅：用户试过多个地区后不会越积越多
    const staleKeys: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(CACHE_KEY_PREFIX) && key !== cacheKey(cache.url)) {
        staleKeys.push(key)
      }
    }
    for (const key of staleKeys) localStorage.removeItem(key)
  } catch {
    // 容量不足或隐私模式：放弃缓存，不影响本次渲染
  }
}

/**
 * 读取缓存的时间戳（**忽略 TTL**，但仍要求缓存版本一致），设置面板展示「上次更新」用。
 * localStorage 在同一扩展的 newtab / options 页之间共享。
 */
export const readSubscriptionFetchedAt = (url: string): number =>
  readSubscriptionCache(url, 0)?.fetchedAt ?? 0

/** 只接受 http(s) 的绝对地址 */
export const isValidSubscriptionUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const fetchText = async (url: string): Promise<string> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw Object.assign(new Error(`HTTP ${response.status}`), {
        subscriptionError: { code: 'http', status: response.status },
      })
    }

    const contentLength = Number(response.headers?.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_ICS_BYTES) {
      throw Object.assign(new Error('calendar too large'), {
        subscriptionError: { code: 'too-large' },
      })
    }

    const text = await response.text()
    if (text.length > MAX_ICS_BYTES) {
      throw Object.assign(new Error('calendar too large'), {
        subscriptionError: { code: 'too-large' },
      })
    }
    return text
  } finally {
    clearTimeout(timer)
  }
}

export interface ILoadSubscriptionOptions {
  /** 节气名集合（由适配层提供，需同时包含简繁名称），用于把节气条目与节日分开 */
  termNames?: ReadonlySet<string>
  /** 忽略缓存强制拉取 */
  force?: boolean
  /** 解析范围覆盖：默认取 ICS 实际年份范围 ∪ [当前年-1, 当前年+2] */
  fromYear?: number
  toYear?: number
}

/**
 * 解析年份的合理边界，防止异常源把年份拉到离谱的范围。
 *
 * 必须与 widget 侧的可浏览范围（`newtab/widgets/calendar/config.ts` 的
 * CALENDAR_MIN_YEAR / CALENDAR_MAX_YEAR）保持一致，由 calendar-range.test.ts 锁住：
 * 「翻得到的年份」不该超出「可能有节日数据的年份」。
 */
export const MIN_PARSE_YEAR = 1900
export const MAX_PARSE_YEAR = 2100

const clampYear = (year: number): number =>
  Math.min(MAX_PARSE_YEAR, Math.max(MIN_PARSE_YEAR, year))

/**
 * 拉取并解析订阅
 * @throws 解析或网络失败时抛出带 subscriptionError 的错误
 */
export const fetchSubscription = async (
  url: string,
  options: ILoadSubscriptionOptions = {},
): Promise<ISubscriptionCache> => {
  if (!isValidSubscriptionUrl(url)) {
    throw Object.assign(new Error('invalid url'), {
      subscriptionError: { code: 'invalid-url' },
    })
  }

  let text: string
  try {
    text = await fetchText(url)
  } catch (error) {
    if (error && typeof error === 'object' && 'subscriptionError' in error)
      throw error
    throw Object.assign(new Error('network error'), {
      subscriptionError: { code: 'network' },
    })
  }

  if (!looksLikeCalendar(text)) {
    throw Object.assign(new Error('not a calendar'), {
      subscriptionError: { code: 'not-calendar' },
    })
  }

  const currentYear = new Date().getFullYear()
  /**
   * 解析窗口 = ICS 里实际出现的年份范围 ∪ [当前年-1, 当前年+2]。
   *
   * 这里刻意不再固定“今年 ±2”：
   *   - Apple 的源会同时包含历史与未来若干年（实测 CN 2023–2029、很多地区到 2030），
   *     固定窗口会丢掉源里已有的年份（例如 2026 年时看不到 2024 的春节）
   *   - 用源的实际范围能保证用户翻到源覆盖的年份都有节日/休班；超出源范围的年份本来就没有数据
   *   - 年份边界限制在 1900–2100，避免异常源导致无意义的大范围展开
   *   - 范围只看显式 DTSTART/DTEND；RRULE 的 COUNT 若超出该范围，最多再展开到当前年+2，
   *     不会按 COUNT 无限外推（Apple 源的 COUNT 都在显式范围内）
   */
  const range = getCalendarYearRange(text)
  const rawFromYear =
    options.fromYear ??
    Math.min(range?.minYear ?? currentYear - 1, currentYear - 1)
  const rawToYear =
    options.toYear ??
    Math.max(range?.maxYear ?? currentYear + 2, currentYear + 2)
  const fromYear = Math.min(clampYear(rawFromYear), clampYear(rawToYear))
  const toYear = Math.max(clampYear(rawFromYear), clampYear(rawToYear))

  const map = parseCalendar(text, {
    fromYear,
    toYear,
    termNames: options.termNames,
  })

  if (map.size === 0) {
    throw Object.assign(new Error('empty calendar'), {
      subscriptionError: { code: 'empty' },
    })
  }

  const days: Record<string, IIcsDayEntry> = {}
  for (const [key, entry] of map) days[key] = entry

  return { url, fetchedAt: Date.now(), days }
}

/** 订阅的运行期状态（供 widget 响应式读取） */
export const subscriptionState = reactive({
  /** 当前订阅地址 */
  url: '',
  /** loading = 首次加载（无数据）；ready = 有数据可用（可能正在后台刷新） */
  status: 'idle' as 'idle' | 'loading' | 'ready',
  /** 日期键 → 当天条目 */
  days: {} as Record<string, IIcsDayEntry>,
  /** 最近一次失败原因（即使有旧缓存也会保留，供设置面板展示） */
  error: null as TSubscriptionError | null,
  /**
   * 本次失败是否要提示给用户（widget 顶栏的警告图标）。
   * 自动刷新失败在同一自然日只提示第一次，详见 shouldPromptError。
   */
  isErrorVisible: false,
  /** 数据时间戳 */
  fetchedAt: 0,
})

/**
 * 加载序号：每次发起（或重置）加载都 +1。
 * 异步返回时序号不一致，说明期间已有更新的加载，旧结果必须丢弃。
 */
let loadToken = 0

const resetState = (url: string): void => {
  loadToken += 1
  subscriptionState.url = url
  subscriptionState.status = 'idle'
  subscriptionState.days = {}
  subscriptionState.error = null
  subscriptionState.isErrorVisible = false
  subscriptionState.fetchedAt = 0
}

/**
 * 加载订阅（优先用缓存，缓存缺失或过期时拉取）
 *
 * 有缓存/旧数据时立刻可用（status: ready），刷新在后台进行；
 * 没有缓存时进入 loading，拉取失败则保持 error 状态由 UI 提示重试。
 */
/**
 * 同一 URL 的并发加载合并，避免设置面板与 widget 同时触发两次请求。
 * 同时记录 token：已被新加载作废的旧任务不能被后续同 URL 请求复用，
 * 否则会拿到一个“结果注定被丢弃”的 Promise，界面一直停在空状态。
 */
interface IInFlightLoad {
  token: number
  promise: Promise<void>
}

const inFlightLoads = new Map<string, IInFlightLoad>()

const runLoadSubscription = async (
  url: string,
  options: ILoadSubscriptionOptions,
  token: number,
): Promise<void> => {
  if (!url) {
    resetState('')
    return
  }

  // 切换订阅地址：先清掉上一个地址的数据与错误，避免 UI 读到旧地区数据
  if (subscriptionState.url !== url) {
    subscriptionState.url = url
    subscriptionState.days = {}
    subscriptionState.fetchedAt = 0
  }
  subscriptionState.error = null
  subscriptionState.isErrorVisible = false

  const cached = options.force ? null : readSubscriptionCache(url)
  if (cached) {
    subscriptionState.url = url
    subscriptionState.status = 'ready'
    subscriptionState.days = cached.days
    subscriptionState.fetchedAt = cached.fetchedAt
    return
  }

  /**
   * 刷新期间先展示过期缓存/内存里的旧数据，避免日历在请求完成前被清空。
   * 这也是「有缓存就先渲染」的另一半：TTL 过期只影响是否重新请求，不影响展示。
   */
  const stale = readSubscriptionCache(url, 0)
  if (stale) {
    subscriptionState.days = stale.days
    subscriptionState.fetchedAt = stale.fetchedAt
    subscriptionState.status = 'ready'
  } else if (Object.keys(subscriptionState.days).length === 0) {
    subscriptionState.status = 'loading'
  } else {
    subscriptionState.status = 'ready'
  }

  try {
    const fresh = await fetchSubscription(url, options)
    if (token !== loadToken) return
    writeSubscriptionCache(fresh)
    subscriptionState.days = fresh.days
    subscriptionState.fetchedAt = fresh.fetchedAt
    subscriptionState.status = 'ready'
    subscriptionState.error = null
    subscriptionState.isErrorVisible = false
  } catch (error) {
    if (token !== loadToken) return
    subscriptionState.error = (
      error as { subscriptionError?: TSubscriptionError }
    ).subscriptionError ?? {
      code: 'network',
    }
    subscriptionState.isErrorVisible = shouldPromptError(Boolean(options.force))
    /**
     * 过期缓存仍可展示，避免日历突然空掉。
     * 用的是上面已经读到的 stale：请求失败不会写缓存，token 守卫又排除了并发加载，
     * 所以这里再读一次 localStorage 拿到的必然是同一份数据。
     */
    if (stale) {
      subscriptionState.days = stale.days
      subscriptionState.fetchedAt = stale.fetchedAt
      subscriptionState.status = 'ready'
    } else if (Object.keys(subscriptionState.days).length > 0) {
      subscriptionState.status = 'ready'
    } else {
      subscriptionState.days = {}
      subscriptionState.status = 'loading'
    }
  }
}

export const loadSubscription = (
  url: string,
  options: ILoadSubscriptionOptions = {},
): Promise<void> => {
  if (!url) {
    resetState('')
    return Promise.resolve()
  }

  /**
   * 强制刷新不能被"正在进行的普通加载"吞掉（普通加载命中缓存时会立刻返回、并不请求）；
   * 因此 force 用独立的 key。代价是 force 与普通加载并发时可能发两次请求，这是有意的。
   */
  const key = options.force ? `${url}|force` : url
  const existing = inFlightLoads.get(key)
  if (existing && existing.token === loadToken) return existing.promise
  // 已被 resetState/其它加载作废的任务：丢掉引用，重新发起
  if (existing) inFlightLoads.delete(key)

  const token = ++loadToken
  const task = runLoadSubscription(url, options, token).finally(() => {
    const current = inFlightLoads.get(key)
    if (current?.token === token) inFlightLoads.delete(key)
  })
  inFlightLoads.set(key, { token, promise: task })
  return task
}
