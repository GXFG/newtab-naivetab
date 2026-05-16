/**
 * @module image/gallery
 * @description 图片库管理 — Bing/Pexels 图片列表获取、分页加载、更新、汇总视图。
 *   图库数据存储在 imageLocalState 中（localStorage 持久化）。
 * @dependencies api/image.ts（getBingImagesData/getPexelsImagesData）、image/state.ts
 * @consumers setting/panes/general/BackgroundDrawer.vue、image/service.ts
 * @see docs/architecture/background.md
 */
import { ref } from 'vue'
import { getBingImagesData, getPexelsImagesData } from '@/api'
import { log } from '@/logic/utils/common'
import { localConfig } from '@/logic/config/state'
import { IMAGE_NETWORK_SOURCE } from '@/logic/image/constants'
import { imageLocalState, isImageGalleryLoading } from './state'

const localBingList = ref<TImage.BaseImageItem[]>([])

export const getLocalBingList = async (): Promise<void> => {
  if (localBingList.value.length > 0) {
    return
  }
  try {
    const response = await fetch('/assets/bing-wallpaper.md')
    const text = await response.text()

    const lines = text.split('\n')
    const batchSize = 100
    let index = 0

    localBingList.value = []

    return new Promise<void>((resolve) => {
      const processBatch = () => {
        const batch = lines.slice(index, index + batchSize)
        const processedBatch = batch
          .filter((line) => /^\d{4}-\d{2}-\d{2} \|/.test(line.trim()))
          .map((line) => {
            const nameMatch = line.match(/th\?id=OHR\.(.*?)_UHD\.jpg/)
            const name = nameMatch ? nameMatch[1] : ''
            const descMatch = line.match(/\[(.*?)\s*\(/)
            const desc = descMatch ? descMatch[1] : ''
            return {
              name,
              desc,
            }
          })
          .filter((item) => item.name && item.desc)

        localBingList.value.push(...processedBatch)
        index += batchSize
        if (index < lines.length) {
          requestIdleCallback(processBatch)
        } else {
          resolve()
        }
      }

      requestIdleCallback(processBatch)
    })
  } catch (e) {
    console.error(e)
    // catch 块中 resolve() 确保 async 函数返回 resolved Promise，
    // 而非 rejected/never-resolve。调用方 updateBingImages 是 fire-and-forget，
    // 但显式 resolve 能避免 "Promise 挂起" 的错觉和潜在的未处理 rejection。
  }
}

export const getBingImageList = async () => {
  try {
    isImageGalleryLoading.value = true
    const data = await getBingImagesData()
    isImageGalleryLoading.value = false
    imageLocalState.value.bing.syncTime = dayjs().valueOf()
    imageLocalState.value.bing.list = data.images.map(
      (item: TImage.BingImageItem) => {
        const name = item.urlbase.split('OHR.')[1]
        return {
          name,
          desc: item.copyright,
        }
      },
    )
    log('Image update BingImageList')
  } catch (e) {
    isImageGalleryLoading.value = false
  }
}

export const getPexelsImageList = async () => {
  try {
    isImageGalleryLoading.value = true
    const currentPage = imageLocalState.value.pexels.currentPage || 1
    const data = await getPexelsImagesData({
      page: currentPage,
      per_page: 80,
    })
    isImageGalleryLoading.value = false
    imageLocalState.value.pexels.syncTime = dayjs().valueOf()
    const newList = data.photos.map((item: TImage.PexelsImageItem) => ({
      name: `${item.id}`,
      desc: `${item.alt} (${item.photographer})`,
    }))
    imageLocalState.value.pexels.list.push(...newList)
    imageLocalState.value.pexels.currentPage = currentPage + 1
    log(
      'Image update PexelsImageList, page:',
      currentPage,
      'added:',
      newList.length,
    )
  } catch (e) {
    isImageGalleryLoading.value = false
  }
}

export const updateBingImages = async () => {
  getLocalBingList()
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为3小时
  if (currTS - imageLocalState.value.bing.syncTime <= 3600000 * 3) {
    return
  }
  await getBingImageList()
}

export const updatePexelsImages = async () => {
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为3小时
  if (currTS - imageLocalState.value.pexels.syncTime <= 3600000 * 3) {
    return
  }
  // 重新同步时清空列表、重置为第1页
  imageLocalState.value.pexels.list = []
  imageLocalState.value.pexels.currentPage = 1
  await getPexelsImageList()
}

export const previewImageListMap = computed(() => ({
  favorite: localConfig.general.favoriteImageList,
  bing: [...imageLocalState.value.bing.list, ...localBingList.value].map(
    (item) => ({
      ...item,
      networkSourceType: IMAGE_NETWORK_SOURCE.BING,
    }),
  ),
  pexels: imageLocalState.value.pexels.list.map((item) => ({
    ...item,
    networkSourceType: IMAGE_NETWORK_SOURCE.PEXELS,
  })),
}))
