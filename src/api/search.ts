import http from '@/lib/http'

export const getBaiduSugrec = (keyword: string) => {
  return http({
    url: 'https://www.baidu.com/sugrec',
    params: {
      prod: 'pc',
      wd: keyword,
    },
  })
}
