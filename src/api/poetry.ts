import request from '@/lib/request'
import { localConfig } from '@/logic/store'

export const getPoetryTokenData = (): Promise<{
  status: string
  data: string
}> => {
  return request({
    method: 'get',
    url: 'https://v2.jinrishici.com/token',
  })
}

export const getTodayPoetryData = (
  token: string,
): Promise<{
  status: string
  data: PoetryData
}> => {
  return request({
    method: 'get',
    url: 'https://v2.jinrishici.com/one.json',
    headers: {
      'X-User-Token': token,
    },
  })
}
