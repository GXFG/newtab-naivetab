import { useStorageLocal } from '@/composables/useStorageLocal'
import { getBingImages } from '@/api'
import { localState } from '@/logic'

export const imageState = ref(useStorageLocal('data-images', {
  imageList: [] as ImageItem[],
  syncDate: '',
  localBackgroundFileName: '',
  localBackgroundBase64: '',
}))

/**
 * @param size: UHD, 1920x1080, 1366x768
 */
export const getImageUrlFromBing = (url: string, size = 'UHD'): string => `http://cn.bing.com/${url}_${size}.jpg`

export const isImageLoading = ref(false)
export const isImageListLoading = ref(false)

const getImages = async() => {
  try {
    isImageListLoading.value = true
    const data: any = await getBingImages()
    isImageListLoading.value = false
    imageState.value.syncDate = dayjs().format('YYYY-MM-DD')
    imageState.value.imageList = data.images
  } catch (e) {
    isImageListLoading.value = false
  }
}

const renderBackgroundImage = async(initPage: boolean, clearStyle = false) => {
  isImageLoading.value = true
  await nextTick()
  const backgroundEl: any = document.querySelector('#background__container')
  if (clearStyle) {
    backgroundEl.style = ''
    return
  }
  let currUrl = ''
  if (localState.style.general.backgroundImageSource === 0) {
    currUrl = imageState.value.localBackgroundBase64
  } else {
    if (initPage && localState.style.general.backgroundImageUrl.length !== 0) {
      // 初始化页面时且本地有图片缓存时，读取上一次的设置
      currUrl = localState.style.general.backgroundImageUrl
    } else {
      let index = imageState.value.imageList.findIndex((item: ImageItem) => item.urlbase === localState.style.general.backgroundImageId)
      index = index === -1 ? 0 : index
      const urlbase = imageState.value.imageList[index].urlbase
      const httpUrl = getImageUrlFromBing(urlbase)
      localState.style.general.backgroundImageUrl = httpUrl
      currUrl = httpUrl
    }
  }
  const imgEle = new Image()
  imgEle.src = currUrl
  // 图片加载完成后再切换背景图
  imgEle.onload = async() => {
    const bgImg = `background-image: url(${currUrl});`
    backgroundEl.style = bgImg
    await nextTick()
    isImageLoading.value = false
  }
  imgEle.onerror = () => {
    isImageLoading.value = false
  }
}

watch([
  () => localState.style.general.backgroundImageSource,
  () => localState.style.general.backgroundImageId,
  () => imageState.value.localBackgroundBase64,
  () => localState.style.general.backgroundImageUrl,
], () => {
  if (!localState.style.general.isBackgroundImageEnabled || imageState.value.imageList.length === 0) {
    return
  }
  renderBackgroundImage(false)
})

watch(() => localState.style.general.isBackgroundImageEnabled, async(isEnabled) => {
  if (imageState.value.imageList.length === 0) {
    await getImages()
  }
  renderBackgroundImage(true, !isEnabled)
}, { immediate: true })

export const onRefreshImageList = () => {
  getImages()
}
