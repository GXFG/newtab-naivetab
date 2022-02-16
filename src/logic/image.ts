import { useStorageLocal } from '@/composables/useStorageLocal'
import { getBingImages } from '@/api'
import { localState } from '@/logic'

export const imageState = ref(useStorageLocal('data-images', {
  imageList: [] as BingImageItem[],
  localBackgroundFileName: '',
  localBackgroundBase64: '',
}))

/**
 * e.g.: http://cn.bing.com//th?id=OHR.YurisNight_ZH-CN5738817931_UHD.jpg
 * @param size: 1366x768, 1920x1080, UHD
 */
export const getBingImageUrlFromName = (name: string, size = '1366x768'): string => `http://cn.bing.com/th?id=OHR.${name}_${size}.jpg`

export const previewImageListMap = computed(() => ({
  favorite: localState.setting.general.favoriteBackgroundList,
  bing: imageState.value.imageList.map((item: BingImageItem) => {
    const name = item.urlbase.split('OHR.')[1]
    return {
      name,
      desc: item.copyright,
    }
  }),
}))

export const isImageLoading = ref(false)
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

const renderBackgroundImage = async(clearStyle = false) => {
  isImageLoading.value = true
  await nextTick()
  const backgroundEl: any = document.querySelector('#background__container')
  if (clearStyle) {
    backgroundEl.style = ''
    return
  }
  const currUrl = localState.setting.general.backgroundImageSource === 0
    ? imageState.value.localBackgroundBase64
    : getBingImageUrlFromName(localState.setting.general.backgroundImageName, 'UHD')
  const imgEle = new Image()
  imgEle.src = currUrl
  imgEle.onload = async() => {
    // 图片加载完成后再切换背景图
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
  () => imageState.value.localBackgroundBase64,
  () => localState.setting.general.backgroundImageSource,
  () => localState.setting.general.backgroundImageName,
], () => {
  if (!localState.setting.general.isBackgroundImageEnabled || imageState.value.imageList.length === 0) {
    return
  }
  renderBackgroundImage()
})

watch(() => localState.setting.general.isBackgroundImageEnabled, async(isEnabled) => {
  if (imageState.value.imageList.length === 0) {
    await getImages()
  }
  renderBackgroundImage(!isEnabled)
}, { immediate: true })

export const onRefreshImageList = () => {
  getImages()
}
