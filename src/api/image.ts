import http from '@/lib/http'

export const getBingImages = (
  count = 8,
): Promise<{
  images: BingImageItem[]
}> => {
  return http({
    method: 'get',
    url: 'https://cn.bing.com/HPImageArchive.aspx',
    params: {
      format: 'js',
      idx: 0, // idx=0 表示是显示当天的时间，1表示昨天...，支持查看历史 15 天以内的图片
      n: count, // 1-8 返回请求数量，目前最多一次获取8张
    },
  })
}
