/**
 * 搜索引擎常量 — 搜索引擎列表定义与模板。
 */
export interface TSearchEngine {
  label: string
  value: string
  faviconUrl: string
  suggestUrl?: string
}

export const SEARCH_ENGINE_LIST: TSearchEngine[] = [
  {
    label: 'Baidu',
    value: 'https://www.baidu.com/s?word={query}',
    faviconUrl: 'https://www.baidu.com/favicon.ico',
    suggestUrl: 'https://www.baidu.com/sugrec?prod=pc&wd={query}',
  },
  {
    label: 'Bing',
    value: 'https://cn.bing.com/search?q={query}',
    faviconUrl: 'https://cn.bing.com/favicon.ico',
    suggestUrl: 'https://api.bing.com/osjson.aspx?query={query}&json=1',
  },
  {
    label: 'Google',
    value: 'https://www.google.com/search?q={query}',
    faviconUrl: 'https://www.google.com/favicon.ico',
    suggestUrl:
      'https://suggestqueries.google.com/complete/search?client=chrome&q={query}',
  },
  {
    label: 'Github',
    value: 'https://github.com/search?q={query}',
    faviconUrl: 'https://github.com/favicon.ico',
  },
  {
    label: 'Qwant',
    value: 'https://www.qwant.com/?q={query}',
    faviconUrl:
      'https://www.qwant.com/public/favicon.066f5ee2ab77b590bb5846c32c57cb84.ico',
  },
  {
    label: 'Duckduckgo',
    value: 'https://duckduckgo.com?q={query}',
    faviconUrl: 'https://duckduckgo.com/favicon.ico',
    suggestUrl: 'https://duckduckgo.com/ac/?q={query}&type=list',
  },
  {
    label: 'Yandex',
    value: 'https://yandex.com/search?text={query}',
    faviconUrl: 'https://yandex.com/favicon.ico',
    suggestUrl: 'https://suggest.yandex.com/suggest-ff.cgi?part={query}',
  },
  {
    label: 'Yahoo',
    value: 'https://search.yahoo.com/search?p={query}',
    faviconUrl: 'https://search.yahoo.com/favicon.ico',
  },
  {
    label: 'Sogou',
    value: 'https://www.sogou.com/web?query={query}',
    faviconUrl: 'https://www.sogou.com/favicon.ico',
    suggestUrl: 'https://w.sugg.sogou.com/sugg/ajaj_json?key={query}&type=web',
  },
  {
    label: '360',
    value: 'https://www.so.com/s?q={query}',
    faviconUrl: 'https://www.so.com/favicon.ico',
    suggestUrl:
      'https://sug.so.360.cn/suggest?word={query}&encodein=utf-8&encodeout=utf-8',
  },
]
