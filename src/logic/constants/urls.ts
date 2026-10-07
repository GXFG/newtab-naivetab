/**
 * URL 常量 — 扩展商店、GitHub、文档、天气、新闻源等链接。
 *
 * NEWS_SOURCE_MAP 同时充当新闻来源键的唯一真源：数据层（newsLocalState 槽位、
 * 抓取函数）、设置面板、i18n 标签都以此为准。消费持久化配置（
 * localConfig.news.sourceList）时先用 isNewsSource / filterValidNewsSources 白名单
 * 校验，避免历史残留的未知来源键导致按下标取值崩溃。
 */
export const URL_FEEDBACK_EMAIL =
  'mailto:gxfgim@outlook.com?subject=NaiveTab Feedback'

export const URL_CHROME_STORE =
  'https://chromewebstore.google.com/detail/naivetab-%E5%8F%AF%E8%A7%86%E5%8C%96%E9%94%AE%E7%9B%98%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/hhfebdcoeoddbdhgcgflblcjcgogijem'
export const URL_EDGE_STORE =
  'https://microsoftedge.microsoft.com/addons/detail/naivetab-%E5%8F%AF%E8%A7%86%E5%8C%96%E9%94%AE%E7%9B%98%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/kejadmppkffccjopodhekdnmkofidmjl'
export const URL_FIREFOX_STORE =
  'https://addons.mozilla.org/zh-CN/firefox/addon/naivetab-%E5%8F%AF%E8%A7%86%E5%8C%96%E9%94%AE%E7%9B%98%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/'

export const URL_GITHUB_HOME = 'https://github.com/GXFG/newtab-naivetab'
export const URL_GITHUB_ISSUSE =
  'https://github.com/GXFG/newtab-naivetab/issues'

export const URL_NAIVETAB_HOME = 'https://naivetab.gxfg.cc/'

export const URL_DAYJS_FORMAT = 'https://day.js.org/docs/zh-CN/display/format'
export const URL_QWEATHER_HOME = 'https://www.qweather.com/'
export const URL_QWEATHER_START = 'https://dev.qweather.com/docs/start'

export const NEWS_SOURCE_MAP = {
  toutiao: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
  baidu: 'https://top.baidu.com/board?tab=realtime',
  zhihu: 'https://www.zhihu.com/hot',
  weibo: 'https://s.weibo.com/top/summary?cate=realtimehot',
  kr36: 'https://36kr.com/hot-list/catalog',
  v2ex: 'https://www.v2ex.com/?tab=hot',
  bilibili: 'https://www.bilibili.com/v/popular/rank/all',
  github: 'https://github.com/trending',
  hackernews: 'https://news.ycombinator.com/news',
}

/** 受支持的新闻来源键（NEWS_SOURCE_MAP 的 key，顺序即设置面板默认展示顺序） */
export const NEWS_SOURCE_KEYS = Object.keys(NEWS_SOURCE_MAP) as NewsSources[]

/**
 * 判断任意值是否为受支持的新闻来源键
 *
 * 用 hasOwnProperty 而非 `in`：后者会命中原型链（'constructor'、'toString' 等）。
 */
export const isNewsSource = (value: unknown): value is NewsSources =>
  typeof value === 'string' &&
  Object.prototype.hasOwnProperty.call(NEWS_SOURCE_MAP, value)

/**
 * 过滤出受支持的来源键，保持原顺序
 *
 * 用于 localConfig.news.sourceList —— 该数组持久化 + 云同步 + 支持导入，
 * 可能残留旧版本或手工写入的未知键（如 'reddit'）。
 */
export const filterValidNewsSources = (list: unknown): NewsSources[] =>
  Array.isArray(list) ? list.filter(isNewsSource) : []
