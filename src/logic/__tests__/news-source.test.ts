import { describe, it, expect, vi } from 'vitest'
import { reactive } from 'vue'
import {
  NEWS_SOURCE_KEYS,
  NEWS_SOURCE_MAP,
  filterValidNewsSources,
  isNewsSource,
} from '@/logic/constants/urls'

/**
 * news-source.test.ts — 资讯来源键白名单与脏配置容错
 *
 * 背景：`localConfig.news.sourceList` 持久化 + 云同步 + 支持导入，可能残留当前版本
 * 不支持的来源键（真实案例：['zhihu', ..., 'hackernews', 'reddit']）。未知键在
 * newsLocalState 中没有数据槽，会导致：
 *   1. 渲染函数读 `newsLocalState[source].list` → TypeError（WidgetErrorBoundary 捕获）
 *   2. updateNews 读 `state.syncTime` → TypeError → 未捕获 Promise 拒绝
 *
 * 覆盖：
 * - isNewsSource / filterValidNewsSources 白名单语义（含原型链键、非数组输入）
 * - updateNews 遇未知来源不抛错、跳过该来源并幂等回写清理后的配置
 * - 当前 tab 指向未知来源时回退到第一个有效来源
 */

/** 真实用户配置：9 个受支持来源 + 历史残留的未知来源 'reddit' */
const DIRTY_SOURCE_LIST = [
  'zhihu',
  'toutiao',
  'baidu',
  'kr36',
  'weibo',
  'bilibili',
  'v2ex',
  'github',
  'hackernews',
  'reddit',
]

const VALID_SOURCE_LIST = DIRTY_SOURCE_LIST.slice(0, 9)

describe('资讯来源键白名单', () => {
  it('NEWS_SOURCE_KEYS 与 NEWS_SOURCE_MAP 一致', () => {
    expect(NEWS_SOURCE_KEYS).toEqual(Object.keys(NEWS_SOURCE_MAP))
    expect(NEWS_SOURCE_KEYS).toHaveLength(9)
  })

  it('isNewsSource 只接受受支持键', () => {
    expect(isNewsSource('github')).toBe(true)
    expect(isNewsSource('reddit')).toBe(false)
    expect(isNewsSource('')).toBe(false)
    expect(isNewsSource(undefined)).toBe(false)
    expect(isNewsSource(null)).toBe(false)
    expect(isNewsSource(0)).toBe(false)
    // 原型链上的键（'constructor' / 'toString'）不算受支持来源
    expect(isNewsSource('constructor')).toBe(false)
    expect(isNewsSource('toString')).toBe(false)
  })

  it('filterValidNewsSources 剔除未知键并保持原顺序', () => {
    expect(filterValidNewsSources(DIRTY_SOURCE_LIST)).toEqual(VALID_SOURCE_LIST)
    expect(filterValidNewsSources(['reddit'])).toEqual([])
    // 非数组输入兜底为空数组（配置被写成字符串/对象时不应崩溃）
    expect(filterValidNewsSources(undefined)).toEqual([])
    expect(filterValidNewsSources('toutiao')).toEqual([])
    expect(filterValidNewsSources({ 0: 'toutiao' })).toEqual([])
  })
})

describe('updateNews 脏配置容错', () => {
  /** 按指定 sourceList 加载一份全新的 news 逻辑模块 */
  async function loadNewsLogic(sourceList: unknown) {
    vi.resetModules()
    const localConfig = reactive({
      news: {
        enabled: true,
        sourceList: sourceList as NewsSources[],
        refreshIntervalTime: 90,
      },
    })
    vi.doMock('@/logic/config/state', () => ({ localConfig }))
    // 抓取函数统一返回空对象，各自走早退分支，不产生真实请求
    vi.doMock('@/api/request', () => ({
      default: { get: vi.fn().mockResolvedValue({}) },
    }))
    const logic = await import('@/newtab/widgets/news/logic')
    return { logic, localConfig }
  }

  it('含未知来源时不抛错，并回写清理后的配置', async () => {
    const { logic, localConfig } = await loadNewsLogic([...DIRTY_SOURCE_LIST])

    await expect(logic.updateNews()).resolves.toBeUndefined()
    expect(localConfig.news.sourceList).toEqual(VALID_SOURCE_LIST)
    expect(logic.validNewsSourceList.value).toEqual(VALID_SOURCE_LIST)
  })

  it('清理是幂等的：配置已干净时不再替换数组引用', async () => {
    const { logic, localConfig } = await loadNewsLogic([...DIRTY_SOURCE_LIST])

    await logic.updateNews()
    const cleaned = localConfig.news.sourceList
    await logic.updateNews()

    expect(localConfig.news.sourceList).toBe(cleaned)
  })

  it('模块初始化时 tab 指向第一个有效来源（跳过前置未知键）', async () => {
    const { logic } = await loadNewsLogic(['reddit', 'toutiao', 'baidu'])

    expect(logic.state.currNewsTabValue).toBe('toutiao')
  })

  it('当前 tab 指向未知来源时回退到第一个有效来源', async () => {
    const { logic } = await loadNewsLogic([...DIRTY_SOURCE_LIST])

    logic.state.currNewsTabValue = 'reddit' as NewsSources
    logic.ensureCurrNewsTab()

    expect(logic.state.currNewsTabValue).toBe('zhihu')
  })

  it('sourceList 全部非法时来源列表为空且不抛错', async () => {
    const { logic, localConfig } = await loadNewsLogic(['reddit', 'v2ex2'])

    await expect(logic.updateNews()).resolves.toBeUndefined()
    expect(logic.validNewsSourceList.value).toEqual([])
    expect(localConfig.news.sourceList).toEqual([])
    expect(logic.state.currNewsTabValue).toBe('')
  })
})
