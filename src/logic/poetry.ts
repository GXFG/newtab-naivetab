import { useStorageLocal } from '@/composables/useStorageLocal'
import { log } from '@/logic/util'
import { getPoetryTokenData, getTodayPoetryData } from '@/api'

export const poetryState = useStorageLocal('data-poetry', {
  token: '',
  syncTime: 0,
  content: '',
  origin: {
    title: '',
    dynasty: '',
    author: '',
    content: [] as string[],
    translate: [] as string[],
  },
  matchTags: [] as string[], // 推荐的理由
  recommendedReason: '',
})

const getPoetryToken = async () => {
  if (poetryState.value.token.length !== 0) {
    return
  }
  const { status, data } = await getPoetryTokenData()
  if (status !== 'success') {
    return
  }
  poetryState.value.token = data
}

const getTodayPoetry = async () => {
  const { status, data } = await getTodayPoetryData(poetryState.value.token)
  if (status !== 'success') {
    return
  }
  poetryState.value.content = data.content
  poetryState.value.origin.title = data.origin.title
  poetryState.value.origin.dynasty = data.origin.dynasty
  poetryState.value.origin.author = data.origin.author
  poetryState.value.origin.content = data.origin.content
  poetryState.value.origin.translate = data.origin.translate
  poetryState.value.matchTags = data.matchTags
  poetryState.value.recommendedReason = data.recommendedReason
  poetryState.value.syncTime = dayjs().valueOf()
}

export const updatePoetry = async () => {
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为4小时
  const intervalTime = 3600000 * 4
  if (currTS - poetryState.value.syncTime >= intervalTime || poetryState.value.content.length === 0) {
    await getPoetryToken()
    await getTodayPoetry()
  }
  log(`${poetryState.value.content} - ${poetryState.value.origin.author}・${poetryState.value.origin.dynasty}`)
  log(`${poetryState.value.matchTags}`)
}
