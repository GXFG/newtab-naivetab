import * as cheerio from 'cheerio'
import { useStorageLocal } from '@/composables/useStorageLocal'
import http from '@/lib/http'
import { localConfig, log } from '@/logic'

export const newsState = useStorageLocal('data-news', {
  baidu: {
    syncTime: 0,
    list: [] as NewsListItem[],
  },
  zhihu: {
    syncTime: 0,
    list: [] as NewsListItem[],
  },
  weibo: {
    syncTime: 0,
    list: [] as NewsListItem[],
  },
  v2ex: {
    syncTime: 0,
    list: [] as NewsListItem[],
  },
})

export const getBaiduNews = async() => {
  const data: string = await http.get('https://top.baidu.com/board?tab=realtime')
  try {
    if (!data) {
      return
    }
    const $ = cheerio.load(data)
    const eleList = $('.title_dIF3B')
    let newsList = [] as NewsListItem[]
    for (const item of eleList) {
      newsList.push({
        url: item.attribs.href || '',
        desc: (item.children[1] as any).childNodes[0].data || '',
      })
    }
    newsList = newsList.slice(1)
    newsState.value.baidu.list = newsList
    newsState.value.baidu.syncTime = dayjs().valueOf()
    log('News update baidu')
  } catch (e) {
    console.warn(e)
  }
}

export const getZhihuNews = async() => {
  const data: string = await http.get('https://www.zhihu.com/hot')
  try {
    if (!data) {
      return
    }
    const $ = cheerio.load(data)
    const eleList = $('.HotItem-content')
    const newsList = [] as NewsListItem[]
    for (const item of eleList) {
      newsList.push({
        url: (item.children[0] as any).attribs.href || '',
        desc: (item.children[0] as any).attribs.title || '',
      })
    }
    newsState.value.zhihu.list = newsList
    newsState.value.zhihu.syncTime = dayjs().valueOf()
    log('News update zhihu')
  } catch (e) {
    console.warn(e)
  }
}

export const getWeiboNews = async() => {
  const data: string = await http.get('https://s.weibo.com/top/summary?cate=realtimehot')
  try {
    if (!data) {
      return
    }
    const $ = cheerio.load(data)
    const eleContainer = $('#pl_top_realtimehot')
    let eleList = (eleContainer[0].children[1] as any).children[3].children
    eleList = eleList.filter((item: any) => item.type === 'tag')
    let newsList = [] as NewsListItem[]
    for (const item of eleList) {
      newsList.push({
        url: (item.children[3] as any).children[1].attribs.href || '',
        desc: (item.children[3] as any).children[1].children[0].data || '',
      })
    }
    newsList = newsList.slice(1)
    newsState.value.weibo.list = newsList
    newsState.value.weibo.syncTime = dayjs().valueOf()
    log('News update weibo')
  } catch (e) {
    console.warn(e)
  }
}

export const getV2exNews = async() => {
  const data: string = await http.get('https://www.v2ex.com/?tab=hot')
  try {
    if (!data) {
      return
    }
    const $ = cheerio.load(data)
    const eleList = $('.item_title .topic-link')
    const newsList = [] as NewsListItem[]
    for (const item of eleList) {
      newsList.push({
        url: `https://www.v2ex.com${item.attribs.href || ''}`,
        desc: (item.children[0] as any).data || '',
      })
    }
    newsState.value.v2ex.list = newsList
    newsState.value.v2ex.syncTime = dayjs().valueOf()
    log('News update v2ex')
  } catch (e) {
    console.warn(e)
  }
}

export const refreshNews = () => {
  getBaiduNews()
  getZhihuNews()
  getWeiboNews()
  getV2exNews()
}

export const updateNews = () => {
  if (!localConfig.news.enabled) {
    return
  }
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为30分钟
  if (currTS - newsState.value.baidu.syncTime <= 60000 * 30) {
    return
  }
  if (localConfig.news.originList.includes('baidu')) {
    getBaiduNews()
  }
  if (localConfig.news.originList.includes('zhihu')) {
    getZhihuNews()
  }
  if (localConfig.news.originList.includes('weibo')) {
    getWeiboNews()
  }
  if (localConfig.news.originList.includes('v2ex')) {
    getV2exNews()
  }
}
