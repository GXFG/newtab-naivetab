/**
 * @module news/logic
 * 新闻 Widget 数据层：从各平台获取热榜数据并缓存到 localStorage。
 * 10 个来源，无 cheerio 依赖（HTML 解析用浏览器原生 DOMParser）。
 *
 * ## 数据获取策略（按 API 类型分为三类）
 *
 * ### 官方 JSON API（稳定，优先使用）
 * - B站：`api.bilibili.com/x/web-interface/ranking/v2`
 * - V2EX：`www.v2ex.com/?tab=hot`（DOMParser 解析，`/api/topics/hot.json` 仅 10 条已弃用）
 * - 头条：`www.toutiao.com/hot-event/hot-board/`
 * - 36氪：`openclaw.36krcdn.com/media/hotlist/{date}/24h_hot_list.json`（每小时更新，~15条）
 * - GitHub Trending：`github.com/trending`（DOMParser 解析 HTML，页面结构多年稳定）
 * - Hacker News：`hn.algolia.com/api/v1/search`（官方 Algolia API，单次请求）
 *
 * ### 内部 JSON API（页面自身使用的接口，非公开但相对稳定）
 * - 百度：`top.baidu.com/api/board?platform=wise&tab=realtime`
 * - 知乎：`zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50`（需用户已登录知乎，401 时提示登录）
 *
 * ### HTML 解析（该源无可用 JSON API，使用浏览器原生 DOMParser）
 * - 微博：`s.weibo.com/top/summary`（`/ajax/side/hotSearch` 需登录 Cookie 已 403）
 *
 * ## 缓存策略
 * 各源数据存入 localStorage（`data-news` key），通过 `syncTime` 时间戳 + `refreshIntervalTime` 控制刷新频率。
 * 刷新仅在组件挂载 / 配置变更时触发，无定时轮询 timer。
 */
import request from '@/api/request'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { NEWS_SOURCE_MAP } from '@/logic/constants/urls'
import { log } from '@/logic/utils/common'
import { localConfig } from '@/logic/config/state'

export const state = reactive({
  currNewsTabValue: localConfig.news.sourceList[0] || '',
})

/** 需要登录的源集合，用于 UI 提示用户先去对应网站登录 */
const authErrorSources = reactive(new Set<NewsSources>())

export const isSourceAuthError = (source: NewsSources) =>
  authErrorSources.has(source)

/** 正在拉取数据的源引用计数 Map，用于 UI 区分"加载中"和"无数据"。引用计数防止并发 fetch 竞态导致 loading 提前消失。 */
const loadingCounts = reactive(new Map<NewsSources, number>())

export const isSourceLoading = (source: NewsSources) =>
  (loadingCounts.get(source) || 0) > 0

/** 标记源开始加载（引用计数 +1） */
const markLoading = (source: NewsSources) => {
  loadingCounts.set(source, (loadingCounts.get(source) || 0) + 1)
}

/** 标记源加载完成（引用计数 -1，归零时自动清理） */
const markLoaded = (source: NewsSources) => {
  const count = (loadingCounts.get(source) || 0) - 1
  if (count <= 0) {
    loadingCounts.delete(source)
  } else {
    loadingCounts.set(source, count)
  }
}

export const newsLocalState = useStorageLocal('data-news', {
  toutiao: { syncTime: 0, list: [] as NewsListItem[] },
  baidu: { syncTime: 0, list: [] as NewsListItem[] },
  zhihu: { syncTime: 0, list: [] as NewsListItem[] },
  weibo: { syncTime: 0, list: [] as NewsListItem[] },
  kr36: { syncTime: 0, list: [] as NewsListItem[] },
  bilibili: { syncTime: 0, list: [] as NewsListItem[] },
  v2ex: { syncTime: 0, list: [] as NewsListItem[] },
  github: { syncTime: 0, list: [] as NewsListItem[] },
  hackernews: { syncTime: 0, list: [] as NewsListItem[] },
})

export const getToutiaoNews = async () => {
  try {
    const res: {
      status: 'success'
      data: { Title: string; ClusterIdStr: string; HotValue: string }[]
    } = await request.get(NEWS_SOURCE_MAP.toutiao)
    if (!res || !res.status || res.status !== 'success') return
    newsLocalState.value.toutiao.list = res.data.map((item) => ({
      url: `https://www.toutiao.com/trending/${item.ClusterIdStr}`,
      desc: item.Title,
      hot: `${Math.floor(+item.HotValue / 10000)}w`,
    }))
    newsLocalState.value.toutiao.syncTime = dayjs().valueOf()
    log('News-update toutiao')
  } catch (e) {
    console.warn(e)
  }
}

export const getBaiduNews = async () => {
  // 百度热搜页面内部 JSON API（替代 cheerio 解析 HTML）
  const API_URL = 'https://top.baidu.com/api/board?platform=wise&tab=realtime'
  try {
    const res: {
      success: boolean
      data: {
        cards: {
          content: {
            content: {
              word: string
              url: string
            }[]
          }[]
        }[]
      }
    } = await request.get(API_URL)
    if (!res || !res.success || !res.data?.cards?.[0]) return
    // 实际结构：cards[0].content[0].content[]（多一层嵌套）
    const items = res.data.cards[0].content?.[0]?.content
    if (!Array.isArray(items)) return
    const newsList = items.map((item) => {
      return {
        url: item.url,
        desc: item.word,
        hot: '',
      }
    })
    newsLocalState.value.baidu.list = newsList
    newsLocalState.value.baidu.syncTime = dayjs().valueOf()
    log('News-update baidu')
  } catch (e) {
    console.warn(e)
  }
}

export const getZhihuNews = async () => {
  // 知乎热榜 API，需用户浏览器中已登录知乎（否则返回 401）
  const API_URL =
    'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50&desktop=true'
  try {
    const res: {
      data: {
        target: { id: number; title: string; url?: string }
        detail_text: string
      }[]
    } = await request.get(API_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      },
    })
    if (!res || !Array.isArray(res.data)) return
    authErrorSources.delete('zhihu')
    const newsList = res.data.map((item) => ({
      url:
        item.target.url || `https://www.zhihu.com/question/${item.target.id}`,
      desc: item.target.title,
      hot: item.detail_text.replace(/热度/g, '').replace(/\s*万/g, 'w').trim(), // "3326 万热度" / "3326万热度" → "3326w"
    }))
    newsLocalState.value.zhihu.list = newsList
    newsLocalState.value.zhihu.syncTime = dayjs().valueOf()
    log('News-update zhihu')
  } catch (e: any) {
    // 401/403 均表示未登录或会话失效，标记供 UI 提示用户登录
    if (e?.response?.status === 401 || e?.response?.status === 403) {
      authErrorSources.add('zhihu')
    }
    console.warn(e)
  }
}

export const getWeiboNews = async () => {
  // weibo.com/ajax/side/hotSearch 需要登录 Cookie 会 403，回退到 HTML 页面解析。
  // 使用浏览器原生 DOMParser（无需 cheerio 依赖）。
  const PAGE_URL = 'https://s.weibo.com/top/summary?cate=realtimehot'
  try {
    const html: string = await request.get(PAGE_URL)
    if (!html) return
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const rows = doc.querySelectorAll('#pl_top_realtimehot tbody tr')
    const newsList: NewsListItem[] = []
    rows.forEach((row) => {
      const link = row.querySelector('.td-02 a') as HTMLAnchorElement | null
      const hotSpan = row.querySelector('.td-02 span')
      if (!link) return
      const url = `https://s.weibo.com${link.getAttribute('href') || ''}`
      const desc = link.textContent?.trim() || ''
      let hot: string | number = hotSpan?.textContent?.trim() || ''
      if (hot) {
        // 非纯数字时取后半段（如 "爆 1234567" → 取 1234567）
        if (isNaN(parseInt(hot, 10))) {
          hot = hot.split(' ').pop() || hot
        }
        // 纯单字无数字（如 "爆"）兜底，避免产出 NaNw
        const count = Math.floor(+hot / 10000)
        if (!isNaN(count)) {
          newsList.push({ url, desc, hot: `${count}w` })
        }
      }
    })
    // 跳过第一行（页面表头占位行）
    newsLocalState.value.weibo.list = newsList.slice(1)
    newsLocalState.value.weibo.syncTime = dayjs().valueOf()
    log('News-update weibo')
  } catch (e) {
    console.warn(e)
  }
}

export const getKr36News = async () => {
  // 36氪官方 CDN JSON API（无需认证，每小时更新，最多15条，替代 cheerio 解析 HTML）
  // 注意：当天数据未生成时返回 404；数据量（~15条）少于页面抓取但更稳定
  const date = dayjs().format('YYYY-MM-DD')
  const API_URL = `https://openclaw.36krcdn.com/media/hotlist/${date}/24h_hot_list.json`
  try {
    const res: {
      data: { title: string; url: string }[]
    } = await request.get(API_URL)
    if (!res || !Array.isArray(res.data)) return
    const newsList = res.data.map((item) => ({
      url: item.url,
      desc: item.title,
      hot: '',
    }))
    newsLocalState.value.kr36.list = newsList
    newsLocalState.value.kr36.syncTime = dayjs().valueOf()
    log('News-update kr36')
  } catch (e) {
    console.warn(e)
  }
}

export const getBilibiliNews = async () => {
  // B站官方热门排行 API，无需认证，返回 JSON（替代 cheerio 解析 HTML）
  // 文档：https://github.com/Dispa1r/bilibili-API-collect/blob/master/docs/video_ranking/popular.md
  const API_URL =
    'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all'
  try {
    const res: {
      code: number
      data: {
        list: {
          bvid: string
          title: string
          stat: { view: number }
        }[]
      }
    } = await request.get(API_URL)
    if (!res || res.code !== 0 || !Array.isArray(res.data?.list)) return
    const newsList = res.data!.list.map((item) => ({
      url: `https://www.bilibili.com/video/${item.bvid}`,
      desc: item.title,
      hot: `${Math.floor(item.stat.view / 10000)}w`,
    }))
    newsLocalState.value.bilibili.list = newsList
    newsLocalState.value.bilibili.syncTime = dayjs().valueOf()
    log('News-update bilibili')
  } catch (e) {
    console.warn(e)
  }
}

export const getV2exNews = async () => {
  // /api/topics/hot.json 固定仅 10 条，回退到 DOMParser 解析公开页面获取更多条目
  const PAGE_URL = 'https://www.v2ex.com/?tab=hot'
  try {
    const html: string = await request.get(PAGE_URL)
    if (!html) return
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const rows = doc.querySelectorAll('#Main .cell.item')
    const newsList: NewsListItem[] = []
    rows.forEach((row) => {
      const link = row.querySelector('.topic-link') as HTMLAnchorElement | null
      const replyEl = row.querySelector('.count_livid')
      if (!link) return
      const path = link.getAttribute('href') || ''
      newsList.push({
        url: path.startsWith('/') ? `https://www.v2ex.com${path}` : path,
        desc: link.textContent?.trim() || '',
        hot: replyEl?.textContent?.trim() || '',
      })
    })
    newsLocalState.value.v2ex.list = newsList
    newsLocalState.value.v2ex.syncTime = dayjs().valueOf()
    log('News-update v2ex')
  } catch (e) {
    console.warn(e)
  }
}

export const getGithubNews = async () => {
  // GitHub Trending 页面（无官方 API，HTML 结构多年稳定，使用 DOMParser 解析）
  const PAGE_URL = NEWS_SOURCE_MAP.github
  try {
    const html: string = await request.get(PAGE_URL)
    if (!html) return
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const rows = doc.querySelectorAll('article.Box-row')
    const newsList: NewsListItem[] = []
    rows.forEach((row) => {
      const link = row.querySelector('h2 a') as HTMLAnchorElement | null
      if (!link) return
      const path = (link.getAttribute('href') || '').trim()
      const name = link.textContent?.replace(/\s+/g, ' ').trim() || ''
      const url = path.startsWith('/') ? `https://github.com${path}` : path
      // 提取 stars 数字，"82 stars today" → "82", "1,234 stars today" → "1234"
      const hotEl = row.querySelector('.float-sm-right')
      const hotText = hotEl?.textContent?.trim() || ''
      const num = hotText.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || ''
      const hot = num ? `${num}⭐` : ''
      newsList.push({ url, desc: name, hot })
    })
    newsLocalState.value.github.list = newsList
    newsLocalState.value.github.syncTime = dayjs().valueOf()
    log('News-update github')
  } catch (e) {
    console.warn(e)
  }
}

export const getHackerNewsTop = async () => {
  // Hacker News 官方 Algolia 搜索 API，一次请求获取完整数据
  // 文档：https://hn.algolia.com/api
  const API_URL =
    'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=25'
  try {
    const res: {
      hits: {
        objectID: string
        title: string
        url?: string
        points: number
      }[]
    } = await request.get(API_URL)
    if (!res || !Array.isArray(res.hits)) return
    const newsList = res.hits.map((item) => ({
      url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
      desc: item.title,
      hot: item.points ? `${item.points}pts` : '',
    }))
    newsLocalState.value.hackernews.list = newsList
    newsLocalState.value.hackernews.syncTime = dayjs().valueOf()
    log('News-update hackernews')
  } catch (e) {
    console.warn(e)
  }
}

const NEWS_SOURCE_FUNC_MAP = {
  toutiao: getToutiaoNews,
  baidu: getBaiduNews,
  zhihu: getZhihuNews,
  weibo: getWeiboNews,
  kr36: getKr36News,
  bilibili: getBilibiliNews,
  v2ex: getV2exNews,
  github: getGithubNews,
  hackernews: getHackerNewsTop,
}

export const onRetryNews = async (value: NewsSources) => {
  const func = NEWS_SOURCE_FUNC_MAP[value]
  if (!func) return
  // 重试时清除认证错误标记（用户可能已登录）
  authErrorSources.delete(value)
  markLoading(value)
  try {
    await func()
  } finally {
    markLoaded(value)
  }
}

export const updateNews = async () => {
  if (!localConfig.news.enabled) {
    return
  }
  const currTS = dayjs().valueOf()
  const intervalTime = localConfig.news.refreshIntervalTime * 60000
  const promises = localConfig.news.sourceList
    .filter((source) => {
      const state = newsLocalState.value[source]
      return currTS - state.syncTime >= intervalTime || state.list.length === 0
    })
    .map(async (source) => {
      markLoading(source)
      try {
        await NEWS_SOURCE_FUNC_MAP[source]()
      } finally {
        markLoaded(source)
      }
    })
  await Promise.allSettled(promises)
  log('All news sources updated')
}

export const handleWatchNewsConfigChange = () => {
  return watch(
    () => localConfig.news.sourceList,
    () => updateNews(),
  )
}
