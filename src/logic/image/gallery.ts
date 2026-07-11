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
// 构建时由 scripts/fetch-bing-wallpaper.ts 自动生成，内置 24h TTL
import bingWallpaperData from './bing-wallpaper.data.json'

const localBingList = ref<TImage.BaseImageItem[]>(
  bingWallpaperData as TImage.BaseImageItem[],
)

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
