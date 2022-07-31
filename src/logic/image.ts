import { useStorageLocal } from '@/composables/useStorageLocal'
import { getBingImages } from '@/api'
import { localConfig, localState, log } from '@/logic'

/**
 * e.g.: http://cn.bing.com//th?id=OHR.YurisNight_ZH-CN5738817931_UHD.jpg
 * @param size: 1366x768, 1920x1080, UHD
 */
export const getBingImageUrlFromName = (name: string, size = '1366x768'): string => `http://cn.bing.com/th?id=OHR.${name}_${size}.jpg`

export const imageState = useStorageLocal('data-images', {
  syncTime: 0,
  imageList: [] as BingImageItem[],
  localBackgroundFileName: '',
  localBackgroundBase64: '',
})

export const currBackgroundImageUrl = computed(() => {
  if (localConfig.general.backgroundImageSource === 0) {
    return imageState.value.localBackgroundBase64
  }
  let imageUrl = ''
  const quality = localConfig.general.backgroundImageHighQuality ? 'UHD' : '1920x1080'
  if (localConfig.general.backgroundImageSource === 1) {
    if (localConfig.general.isBackgroundImageCustomUrlEnabled) {
      imageUrl = localConfig.general.backgroundImageCustomUrls[localState.value.currAppearanceCode]
    } else {
      imageUrl = getBingImageUrlFromName(localConfig.general.backgroundImageNames && localConfig.general.backgroundImageNames[localState.value.currAppearanceCode], quality)
    }
  } else if (localConfig.general.backgroundImageSource === 2) {
    const todayImage = imageState.value.imageList[0]
    const name = (todayImage && todayImage.urlbase.split('OHR.')[1]) || ''
    imageUrl = name ? getBingImageUrlFromName(name, quality) : ''
  }
  return imageUrl
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
    imageState.value.syncTime = dayjs().valueOf()
    imageState.value.imageList = data.images
    log('Image update imageList')
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
  console.timeEnd('renderBackgroundImage')
  isImageLoading.value = false
}

export const renderBackgroundImage = () => {
  console.time('renderBackgroundImage')
  loadImageEle.src = '' // 取消上一张图片的加载，为确保严格按加载顺序生效
  isImageLoading.value = true
  loadImageEle.src = currBackgroundImageUrl.value
}

export const updateImages = () => {
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为2小时
  if (currTS - imageState.value.syncTime <= 3600000 * 2) {
    return
  }
  getImages()
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
  if (localConfig.general.backgroundImageSource === 2) {
    updateImages()
  }
}, {
  deep: true,
})
