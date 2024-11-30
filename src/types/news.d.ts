type NewsSources = 'toutiao' | 'baidu' | 'zhihu' | 'weibo' | 'kr36' | 'bilibili' | 'v2ex'

interface NewsListItem {
  url: string
  desc: string
  hot: string
  cover?: string
}
