import * as cheerio from 'cheerio'
import http from '@/lib/http'

export const getBaiduNews = async() => {
  const data: any = await http.get('https://top.baidu.com/board?tab=realtime')
  const $ = cheerio.load(data)
  const eleList = $('.title_dIF3B') // Todo 确保class准确性
  let newsList = [] as {
    url: string
    text: string
  }[]
  for (const item of eleList) {
    // console.log(item, item.attribs.href, (item.children[1] as any).childNodes[0].data)
    newsList.push({
      url: item.attribs.href,
      text: (item.children[1] as any).childNodes[0].data,
    })
  }
  newsList = newsList.slice(1)
  console.log(newsList)
}

getBaiduNews()
