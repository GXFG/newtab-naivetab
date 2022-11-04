import { useStorageLocal } from '@/composables/useStorageLocal'
import { getBingImages } from '@/api'
import { databaseStore, localConfig, localState, log } from '@/logic'

/**
 * e.g.: http://cn.bing.com//th?id=OHR.YurisNight_ZH-CN5738817931_UHD.jpg
 * @param size: 1366x768, 1920x1080, UHD
 */
export const getBingImageUrlFromName = (name: string, size = '1366x768'): string => `http://cn.bing.com/th?id=OHR.${name}_${size}.jpg`

export const imageLocalState = useStorageLocal('data-images', {
  syncTime: 0,
  imageList: [] as BingImageItem[],
})

export const imageState = reactive({
  currBackgroundImageFileName: '',
  currBackgroundImageFileObjectURL: '',
})

export const currBackgroundImageUrl = computed(() => {
  // 本地
  if (localConfig.general.backgroundImageSource === 0) {
    return imageState.currBackgroundImageFileObjectURL
  }
  let imageUrl = ''
  const quality = localConfig.general.backgroundImageHighQuality ? 'UHD' : '1920x1080'
  if (localConfig.general.backgroundImageSource === 1) {
    // 网络
    if (localConfig.general.isBackgroundImageCustomUrlEnabled) {
      imageUrl = localConfig.general.backgroundImageCustomUrls[localState.value.currAppearanceCode]
    } else {
      imageUrl = getBingImageUrlFromName(localConfig.general.backgroundImageNames && localConfig.general.backgroundImageNames[localState.value.currAppearanceCode], quality)
    }
  } else if (localConfig.general.backgroundImageSource === 2) {
    // 每日一图
    const todayImage = imageLocalState.value.imageList[0]
    const name = (todayImage && todayImage.urlbase.split('OHR.')[1]) || ''
    imageUrl = name ? getBingImageUrlFromName(name, quality) : ''
  }
  return imageUrl
})

export const previewImageListMap = computed(() => ({
  favorite: localConfig.general.favoriteImageList,
  bing: imageLocalState.value.imageList.map((item: BingImageItem) => {
    const name = item.urlbase.split('OHR.')[1]
    return {
      name,
      desc: item.copyright,
    }
  }),
}))

export const isImageListLoading = ref(false)

const getImages = async () => {
  try {
    isImageListLoading.value = true
    const data = await getBingImages()
    isImageListLoading.value = false
    imageLocalState.value.syncTime = dayjs().valueOf()
    imageLocalState.value.imageList = data.images
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

export const renderBackgroundImage = async () => {
  console.time('renderBackgroundImage')
  if (localConfig.general.backgroundImageSource === 0) {
    const result: LocalBackgroundImageItem = await databaseStore('localBackgroundImages', 'get', localState.value.currAppearanceCode)
    // 首次选择backgroundImageSource为本地时无数据
    if (result) {
      imageState.currBackgroundImageFileName = result.file.name
      imageState.currBackgroundImageFileObjectURL = URL.createObjectURL(result.file)
    }
  }
  loadImageEle.src = '' // 取消上一张图片的加载，为确保严格按加载顺序生效
  isImageLoading.value = true
  loadImageEle.src = currBackgroundImageUrl.value
}

export const updateImages = () => {
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为2小时
  if (currTS - imageLocalState.value.syncTime <= 3600000 * 2) {
    return
  }
  getImages()
}

watch([
  () => localState.value.currAppearanceCode,
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
