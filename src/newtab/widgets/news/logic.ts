import * as cheerio from 'cheerio'
import request from '@/lib/request'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { NEWS_SOURCE_MAP } from '@/logic/constants/index'
import { createTab, log } from '@/logic/util'
import { localConfig } from '@/logic/store'

export const state = reactive({
  currNewsTabValue: localConfig.news.sourceList[0] || '',
})

export const newsLocalState = useStorageLocal('data-news', {
  toutiao: { syncTime: 0, list: [] as NewsListItem[] },
  baidu: { syncTime: 0, list: [] as NewsListItem[] },
  zhihu: { syncTime: 0, list: [] as NewsListItem[] },
  weibo: { syncTime: 0, list: [] as NewsListItem[] },
  kr36: { syncTime: 0, list: [] as NewsListItem[] },
  bilibili: { syncTime: 0, list: [] as NewsListItem[] },
  v2ex: { syncTime: 0, list: [] as NewsListItem[] },
})

export const getToutiaoNews = async () => {
  const res: { status: 'success', data: { Title: string, ClusterIdStr: string, HotValue: string }[] } = await request.get(NEWS_SOURCE_MAP.toutiao)
  try {
    if (!res || !res.status || res.status !== 'success') return
    newsLocalState.value.toutiao.list = res.data.map((item) => ({ url: `https://www.toutiao.com/trending/${item.ClusterIdStr}`, desc: item.Title, hot: `${Math.floor(+item.HotValue / 10000)}w` }))
    newsLocalState.value.toutiao.syncTime = dayjs().valueOf()
    log('News-update toutiao')
  } catch (e) {
    console.warn(e)
  }
}

export const getBaiduNews = async () => {
  const data: string = await request.get(NEWS_SOURCE_MAP.baidu)
  try {
    if (!data) return
    const $ = cheerio.load(data)
    let newsList = [] as NewsListItem[]
    $('.category-wrap_iQLoo').each((i, ele) => {
      const url = ($(ele).find('.title_dIF3B').attr('href') || '').trim()
      const desc = $(ele).find('.c-single-text-ellipsis').text().trim()
      let hot = $(ele).children('.trend_2RttY').children('.hot-index_1Bl1a').text().trim()
      hot = `${Math.floor(+hot / 10000)}w`
      newsList.push({ url, desc, hot })
    })
    newsList = newsList.slice(1)
    newsLocalState.value.baidu.list = newsList
    newsLocalState.value.baidu.syncTime = dayjs().valueOf()
    log('News-update baidu')
  } catch (e) {
    console.warn(e)
  }
}

export const getZhihuNews = async () => {
  const data: string = await request.get(NEWS_SOURCE_MAP.zhihu)
  try {
    if (!data) return
    const $ = cheerio.load(data)
    const newsList = [] as NewsListItem[]
    $('.HotItem-content').each((i, ele) => {
      const url = $(ele).children().eq(0).attr('href') || ''
      const desc = $(ele).children().eq(0).attr('title') || ''
      let hot = i === 0 ? ($(ele).children('.HotItem-metrics')[0] as any).children[2].data : $(ele).children('.HotItem-metrics').text() || ''
      const count = hot.split(' ')[0]
      if (!isNaN(count)) {
        hot = `${count}w`
        newsList.push({ url, desc, hot })
      }
    })
    newsLocalState.value.zhihu.list = newsList
    newsLocalState.value.zhihu.syncTime = dayjs().valueOf()
    log('News-update zhihu')
  } catch (e) {
    console.warn(e)
  }
}

export const getWeiboNews = async () => {
  const data: string = await request.get(NEWS_SOURCE_MAP.weibo)
  try {
    if (!data) return
    const $ = cheerio.load(data)
    let newsList = [] as NewsListItem[]
    const eleList = $('#pl_top_realtimehot').find('tbody').children().filter('tr')
    eleList.each((i, ele) => {
      const url = `https://s.weibo.com${$(ele).children('.td-02').children('a').attr('href')}`
      const desc = $(ele).children('.td-02').children('a').text().trim()
      let hot: string | number = $(ele).children('.td-02').children('span').text().trim()
      if (hot) {
        let type = ''
        if (isNaN(parseInt(hot, 10))) {
          const hotList = hot.split(' ')
          type = `${hotList[0]} `
          hot = hotList[1]
        }
        hot = `${type}${Math.floor(+hot / 10000)}w`
        newsList.push({ url, desc, hot })
      }
    })
    newsList = newsList.slice(1)
    newsLocalState.value.weibo.list = newsList
    newsLocalState.value.weibo.syncTime = dayjs().valueOf()
    log('News-update weibo')
  } catch (e) {
    console.warn(e)
  }
}

export const getKr36News = async () => {
  const data: string = await request.get(NEWS_SOURCE_MAP.kr36)
  try {
    if (!data) return
    const $ = cheerio.load(data)
    const newsList = [] as NewsListItem[]
    $('.article-wrapper').each((i, ele) => {
      const url = `https://36kr.com${($(ele).find('.article-item-title').attr('href') || '').trim()}`
      const desc = $(ele).find('.article-item-title').text().trim()
      const hot = $(ele).find('.kr-flow-bar-hot').children('span').text() || ''
      newsList.push({ url, desc, hot })
    })
    newsLocalState.value.kr36.list = newsList
    newsLocalState.value.kr36.syncTime = dayjs().valueOf()
    log('News-update kr36')
  } catch (e) {
    console.warn(e)
  }
}

export const getBilibiliNews = async () => {
  const data: string = await request.get(NEWS_SOURCE_MAP.bilibili)
  try {
    if (!data) return
    const $ = cheerio.load(data)
    const newsList = [] as NewsListItem[]
    $('.rank-item').each((i, ele) => {
      const url = `https:${($(ele).find('.info .title').attr('href') || '').trim()}`
      const desc = $(ele).find('.info .title').text().trim()
      const hot = $(ele).find('.info .detail-state .data-box').eq(0).text().trim()
      newsList.push({ url, desc, hot })
    })
    newsLocalState.value.bilibili.list = newsList
    newsLocalState.value.bilibili.syncTime = dayjs().valueOf()
  } catch (e) {
    console.warn(e)
  }
}

export const getV2exNews = async () => {
  const data: string = await request.get(NEWS_SOURCE_MAP.v2ex)
  try {
    if (!data) return
    const $ = cheerio.load(data)
    const newsList = [] as NewsListItem[]
    $('#Main .cell.item').each((i, ele) => {
      const url = `https://www.v2ex.com${$(ele).find('.topic-link').attr('href')}`
      const desc = $(ele).find('.topic-link').text().trim()
      const hot = $(ele).find('.count_livid').text()
      newsList.push({ url, desc, hot })
    })
    newsLocalState.value.v2ex.list = newsList
    newsLocalState.value.v2ex.syncTime = dayjs().valueOf()
    log('News-update v2ex')
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
}

export const onRetryNews = (value: NewsSources) => {
  createTab(NEWS_SOURCE_MAP[value], true)
  const func = NEWS_SOURCE_FUNC_MAP[value]
  if (func) func()
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
    .map((source) => NEWS_SOURCE_FUNC_MAP[source]())
  await Promise.allSettled(promises)
  log('All news sources updated')
}

export const handleWatchNewsConfigChange = () => {
  return watch(() => localConfig.news.sourceList, () => updateNews())
}
