import { useStorageLocal } from '@/composables/useStorageLocal'
import { getBingImages } from '@/api'
import { databaseStore, localConfig, localState, log, getFileFromUrl } from '@/logic'

/**
 * e.g.: https://cn.bing.com//th?id=OHR.YurisNight_ZH-CN5738817931_UHD.jpg
 * @param size: 1366x768, 1920x1080, UHD
 */
export const getBingImageUrlFromName = (name: string, size = '1366x768'): string => `https://cn.bing.com/th?id=OHR.${name}_${size}.jpg`

export const imageLocalState = useStorageLocal('data-images', {
  syncTime: 0,
  imageList: [] as BingImageItem[],
})

export const imageState = reactive({
  currBackgroundImageFileName: '',
  currBackgroundImageFileObjectURL: '',
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

export const isImageLoading = ref(false)

export const renderBackgroundImage = async () => {
  console.time('renderImage')
  isImageLoading.value = true
  let dbData: BackgroundImageItem | BackgroundImageItem | null = null
  if (localConfig.general.backgroundImageSource === 0) {
    // 本地
    dbData = await databaseStore('localBackgroundImages', 'get', localState.value.currAppearanceCode)
  } else {
    // 网络
    dbData = await databaseStore('currBackgroundImages', 'get', localState.value.currAppearanceCode)
    if (!dbData) {
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
      const targetFile = await getFileFromUrl(imageUrl, imageUrl)
      log('TargetFile', targetFile)
      dbData = {
        appearanceCode: localState.value.currAppearanceCode,
        file: targetFile,
      }
      databaseStore('currBackgroundImages', 'add', dbData)
    }
  }
  // 首次选择backgroundImageSource为本地时无数据，这里判空防止报错
  if (dbData) {
    imageState.currBackgroundImageFileName = dbData.file.name
    imageState.currBackgroundImageFileObjectURL = URL.createObjectURL(dbData.file)
  }
  console.timeEnd('renderImage')
  isImageLoading.value = false
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
], () => {
  if (!localConfig.general.isBackgroundImageEnabled) {
    return
  }
  renderBackgroundImage()
})

watch([
  () => localConfig.general.backgroundImageNames,
  () => localConfig.general.backgroundImageHighQuality,
  () => localConfig.general.backgroundImageCustomUrls,
], () => {
  if (!localConfig.general.isBackgroundImageEnabled) {
    return
  }
  databaseStore('currBackgroundImages', 'delete', localState.value.currAppearanceCode)
  renderBackgroundImage()
}, {
  deep: true,
})
