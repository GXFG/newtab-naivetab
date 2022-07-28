import { useStorageLocal } from '@/composables/useStorageLocal'
import { getBingImages } from '@/api'
import { localConfig, localState } from '@/logic'

/**
 * e.g.: http://cn.bing.com//th?id=OHR.YurisNight_ZH-CN5738817931_UHD.jpg
 * @param size: 1366x768, 1920x1080, UHD
 */
export const getBingImageUrlFromName = (name: string, size = '1366x768'): string => `http://cn.bing.com/th?id=OHR.${name}_${size}.jpg`

export const imageState = useStorageLocal('data-images', {
  imageList: [] as BingImageItem[],
  localBackgroundFileName: '',
  localBackgroundBase64: '',
})

export const currBackgroundImageUrl = computed(() => {
  if (localConfig.general.backgroundImageSource === 0) {
    return imageState.value.localBackgroundBase64
  }
  if (localConfig.general.isBackgroundImageCustomUrlEnabled) {
    return localConfig.general.backgroundImageCustomUrls[localState.value.currAppearanceCode]
  }
  const quality = localConfig.general.backgroundImageHighQuality ? 'UHD' : '1920x1080'
  return getBingImageUrlFromName(localConfig.general.backgroundImageNames && localConfig.general.backgroundImageNames[localState.value.currAppearanceCode], quality)
})

export const previewImageListMap = computed(() => ({
  favorite: localConfig.general.favoriteImageList,
  bing: imageState.value.imageList.map((item: BingImageItem) => {
    const name = item.urlbase.split('OHR.')[1]
    return {
      name,
      desc: item.copyright,
    }
  }),
}))

export const isImageListLoading = ref(false)

const getImages = async() => {
  try {
    isImageListLoading.value = true
    const data: any = await getBingImages()
    isImageListLoading.value = false
    imageState.value.imageList = data.images
  } catch (e) {
    isImageListLoading.value = false
  }
}

export const isImageLoading = ref(true)

const loadImageEle = new Image()

loadImageEle.onload = () => {
  console.timeEnd('renderBackgroundImage')
  isImageLoading.value = false
}

loadImageEle.onerror = () => {
  isImageLoading.value = false
}

export const renderBackgroundImage = () => {
  console.time('renderBackgroundImage')
  loadImageEle.src = '' // 取消上一张图片的加载，为确保严格按加载顺序生效
  isImageLoading.value = true
  loadImageEle.src = currBackgroundImageUrl.value
}

watch([
  () => imageState.value.localBackgroundBase64,
  () => localConfig.general.backgroundImageSource,
  () => localConfig.general.backgroundImageNames,
], () => {
  if (!localConfig.general.isBackgroundImageEnabled) {
    return
  }
  renderBackgroundImage()
}, {
  deep: true,
})

export const onRefreshImageList = () => {
  getImages()
}
