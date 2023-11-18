import request from '@/lib/request'

export const getBaiduSugrec = (
  keyword: string,
): Promise<{
  g: {
    q: string
  }[]
}> => {
  return request({
    url: 'https://www.baidu.com/sugrec',
    params: {
      prod: 'pc',
      wd: keyword,
    },
  })
}
