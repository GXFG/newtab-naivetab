import { useStorageLocal } from '@/composables/useStorageLocal'
import { getBingImages } from '@/api'
import { localState } from '@/logic'

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
  let url = ''
  if (localState.setting.general.backgroundImageSource === 0) {
    url = imageState.value.localBackgroundBase64
  } else if (localState.setting.general.backgroundImageSource === 1) {
    url = localState.setting.general.isBackgroundImageCustomUrlEnabled
      ? localState.setting.general.backgroundImageCustomUrl
      : getBingImageUrlFromName(localState.setting.general.backgroundImageName, 'UHD')
  }
  return url
})

export const previewImageListMap = computed(() => ({
  favorite: localState.setting.general.favoriteImageList,
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
  console.timeEnd('backgroundImage')
  isImageLoading.value = false
}
loadImageEle.onerror = () => {
  isImageLoading.value = false
}

const renderBackgroundImage = () => {
  console.time('backgroundImage')
  loadImageEle.src = '' // 取消上一个图片的加载，为确保严格按加载顺序生效
  isImageLoading.value = true
  loadImageEle.src = currBackgroundImageUrl.value
}

watch([
  () => imageState.value.localBackgroundBase64,
  () => localState.setting.general.backgroundImageSource,
  () => localState.setting.general.backgroundImageName,
], () => {
  if (!localState.setting.general.isBackgroundImageEnabled) {
    return
  }
  renderBackgroundImage()
}, { immediate: true })

export const onRefreshImageList = () => {
  getImages()
}
