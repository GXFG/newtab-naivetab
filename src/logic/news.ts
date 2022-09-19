import * as cheerio from 'cheerio'
import { useStorageLocal } from '@/composables/useStorageLocal'
import http from '@/lib/http'
import { NEWS_SOURCE_MAP, localConfig, createTab, log } from '@/logic'

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

export const getBaiduNews = async () => {
  const data: string = await http.get(NEWS_SOURCE_MAP.baidu)
  try {
    if (!data) {
      return
    }
    const $ = cheerio.load(data)
    let newsList = [] as NewsListItem[]
    $('.category-wrap_iQLoo').each((i, ele) => {
      const url = ($(ele).find('.title_dIF3B').attr('href') || '').trim()
      const desc = $(ele).find('.c-single-text-ellipsis').text().trim()
      let hot = $(ele).children('.trend_2RttY').children('.hot-index_1Bl1a').text().trim()
      hot = `${Math.floor((+hot / 10000))}w`
      newsList.push({ url, desc, hot })
    })
    newsList = newsList.slice(1)
    newsState.value.baidu.list = newsList
    newsState.value.baidu.syncTime = dayjs().valueOf()
    log('News-update baidu')
  } catch (e) {
    console.warn(e)
  }
}

export const getZhihuNews = async () => {
  const data: string = await http.get(NEWS_SOURCE_MAP.zhihu)
  try {
    if (!data) {
      return
    }
    const $ = cheerio.load(data)
    const newsList = [] as NewsListItem[]
    $('.HotItem-content').each((i, ele) => {
      const url = $(ele).children().eq(0).attr('href') || ''
      const desc = $(ele).children().eq(0).attr('title') || ''
      let hot = i === 0
        ? ($(ele).children('.HotItem-metrics')[0] as any).children[2].data
        : $(ele).children('.HotItem-metrics').text() || ''
      const count = hot.split(' ')[0]
      if (!isNaN(count)) {
        // 过滤盐选推荐
        hot = `${count}w`
        newsList.push({ url, desc, hot })
      }
    })
    newsState.value.zhihu.list = newsList
    newsState.value.zhihu.syncTime = dayjs().valueOf()
    log('News-update zhihu')
  } catch (e) {
    console.warn(e)
  }
}

export const getWeiboNews = async () => {
  const data: string = await http.get(NEWS_SOURCE_MAP.weibo)
  try {
    if (!data) {
      return
    }
    const $ = cheerio.load(data)
    let newsList = [] as NewsListItem[]
    const eleList = $('#pl_top_realtimehot').find('tbody').children().filter('tr')
    eleList.each((i, ele) => {
      const url = `https://s.weibo.com${$(ele).children('.td-02').children('a').attr('href')}`
      const desc = $(ele).children('.td-02').children('a').text().trim()
      let hot: string | number = $(ele).children('.td-02').children('span').text().trim()
      if (hot) {
        let type = ''
        if (isNaN(parseInt(hot))) { // 处理格式如：AB 123
          const hotList = hot.split(' ')
          type = `${hotList[0]} `
          hot = hotList[1]
        }
        hot = `${type}${Math.floor((+hot / 10000))}w`
        newsList.push({ url, desc, hot })
      }
    })
    newsList = newsList.slice(1)
    newsState.value.weibo.list = newsList
    newsState.value.weibo.syncTime = dayjs().valueOf()
    log('News-update weibo')
  } catch (e) {
    console.warn(e)
  }
}

export const getV2exNews = async () => {
  const data: string = await http.get(NEWS_SOURCE_MAP.v2ex)
  try {
    if (!data) {
      return
    }
    const $ = cheerio.load(data)
    const newsList = [] as NewsListItem[]
    $('#Main .cell.item').each((i, ele) => {
      const url = `https://www.v2ex.com${$(ele).find('.topic-link').attr('href')}`
      const desc = $(ele).find('.topic-link').text().trim()
      const hot = $(ele).find('.count_livid').text()
      newsList.push({ url, desc, hot })
    })
    newsState.value.v2ex.list = newsList
    newsState.value.v2ex.syncTime = dayjs().valueOf()
    log('News-update v2ex')
  } catch (e) {
    console.warn(e)
  }
}

const newsSourceFuncMap = {
  baidu: getBaiduNews,
  zhihu: getZhihuNews,
  weibo: getWeiboNews,
  v2ex: getV2exNews,
}

export const onRetryNews = (value: NewsSources) => {
  // 部分网站需要先打开页面登录后才可访问
  createTab(NEWS_SOURCE_MAP[value], true)
  const func = newsSourceFuncMap[value]
  if (func) {
    func()
  }
}

export const updateNews = () => {
  if (!localConfig.news.enabled) {
    return
  }
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为30分钟
  if (localConfig.news.sourceList.includes('baidu') && (currTS - newsState.value.baidu.syncTime >= 60000 * 30)) {
    getBaiduNews()
  }
  if (localConfig.news.sourceList.includes('zhihu') && (currTS - newsState.value.zhihu.syncTime >= 60000 * 30)) {
    getZhihuNews()
  }
  if (localConfig.news.sourceList.includes('weibo') && (currTS - newsState.value.weibo.syncTime >= 60000 * 30)) {
    getWeiboNews()
  }
  if (localConfig.news.sourceList.includes('v2ex') && (currTS - newsState.value.v2ex.syncTime >= 60000 * 30)) {
    getV2exNews()
  }
}

watch(() => localConfig.news.sourceList, () => {
  updateNews()
})
