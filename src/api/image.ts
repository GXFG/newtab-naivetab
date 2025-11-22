import request from '@/lib/request'
import { PEXELS_API } from '@/logic/constants/index'
import { localConfig } from '@/logic/store'

// https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=10
export const getBingImagesData = (
  count = 8,
): Promise<{
  images: TImage.BingImageItem[]
}> => {
  return request({
    method: 'get',
    url: 'https://cn.bing.com/HPImageArchive.aspx',
    params: {
      format: 'js',
      idx: 0, // idx=0 表示是显示当天的时间，1表示昨天...，支持查看历史 15 天以内的图片
      n: count, // 1-8 返回请求数量，目前最多一次获取8张
    },
  })
}

// docs: https://www.pexels.com/zh-cn/api/documentation
export const getPexelsImagesData = (params?: {
  page: number // default:1
  per_page: number // default:15, max:80
}): Promise<{
  page: number // 1
  per_page: number // 15
  photos: TImage.PexelsImageItem[]
  total_results: number // 8000
  next_page: string // "https://api.pexels.com/v1/curated/?page=2&per_page=15"
}> => {
  return request({
    method: 'get',
    url: 'https://api.pexels.com/v1/curated',
    headers: {
      Authorization: PEXELS_API,
    },
    params: {
      ...params,
      locale: localConfig.general.lang,
    },
  })
}

export const getPexelsImageById = (id: string): Promise<TImage.PexelsImageItem> => {
  return request({
    method: 'get',
    url: `https://api.pexels.com/v1/photos/${id}`,
    headers: {
      Authorization: PEXELS_API,
    },
    params: {
      locale: localConfig.general.lang,
    },
  })
}

export const getPexelsImagesBySearch = (params: {
  query: string
  page?: number // default:1
  per_page?: number // default:15, max:80
}): Promise<{
  page: number // 1
  per_page: number // 15
  photos: TImage.PexelsImageItem[]
  total_results: number // 8000
  next_page: string // "https://api.pexels.com/v1/curated/?page=2&per_page=15"
}> => {
  return request({
    method: 'get',
    url: 'https://api.pexels.com/v1/search',
    headers: {
      Authorization: PEXELS_API,
    },
    params: {
      ...params,
      locale: localConfig.general.lang,
    },
  })
}
