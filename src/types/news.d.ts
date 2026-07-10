type NewsSources =
  | 'toutiao'
  | 'baidu'
  | 'zhihu'
  | 'weibo'
  | 'kr36'
  | 'bilibili'
  | 'v2ex'
  | 'github'
  | 'hackernews'

interface NewsListItem {
  url: string
  desc: string
  hot: string
}
