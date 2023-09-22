import { useStorageLocal } from '@/composables/useStorageLocal'
import { getBingImages } from '@/api'
import { log, urlToFile, compressedImageUrlToBase64 } from '@/logic/util'
import { databaseStore } from '@/logic/database'
import { localConfig, localState } from '@/logic/store'

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

export const updateImages = async () => {
  const currTS = dayjs().valueOf()
  // 最小刷新间隔为3小时
  if (currTS - imageLocalState.value.syncTime <= 3600000 * 3) {
    return
  }
  await getImages()
}

const getCurrNetworkBackgroundImageUrl = (applyToAppearanceCode = localState.value.currAppearanceCode) => {
  let imageUrl = ''
  const quality = localConfig.general.backgroundImageHighQuality ? 'UHD' : '1920x1080'
  if (localConfig.general.backgroundImageSource === 1) {
    imageUrl = localConfig.general.isBackgroundImageCustomUrlEnabled
      ? localConfig.general.backgroundImageCustomUrls[applyToAppearanceCode]
      : getBingImageUrlFromName(localConfig.general.backgroundImageNames && localConfig.general.backgroundImageNames[applyToAppearanceCode], quality)
  } else if (localConfig.general.backgroundImageSource === 2) {
    const todayImage = imageLocalState.value.imageList[0]
    const name = (todayImage && todayImage.urlbase.split('OHR.')[1]) || ''
    imageUrl = name ? getBingImageUrlFromName(name, quality) : ''
  }
  return imageUrl
}

export const isImageLoading = ref(false)

const renderRawBackgroundImage = async () => {
  console.time('RenderRawImage')
  isImageLoading.value = true
  let dbData: BackgroundImageItem | null = null
  const storeName = localConfig.general.backgroundImageSource === 0 ? 'localBackgroundImages' : 'currBackgroundImages'
  dbData = await databaseStore(storeName, 'get', localState.value.currAppearanceCode)
  if (!dbData) {
    if (localConfig.general.backgroundImageSource === 0) {
      // 首次选择 backgroundImageSource=0本地 时无数据，直接退出
      imageState.currBackgroundImageFileObjectURL = ''
      isImageLoading.value = false
      return
    }
    // 来源为网络、每日一图时，自动在DB内新增当前背景图数据
    const imageUrl = getCurrNetworkBackgroundImageUrl()
    // 存储背景图数据
    const targetFile = await urlToFile(imageUrl, imageUrl)
    const smallBase64 = await compressedImageUrlToBase64(imageUrl)
    dbData = {
      appearanceCode: localState.value.currAppearanceCode,
      file: targetFile,
      smallBase64,
    }
    databaseStore('currBackgroundImages', 'add', dbData)
    localStorage.setItem('l-firstScreen', smallBase64)
    // 每日一图，需要同时设置深色&浅色外观为同一张壁纸
    if (localConfig.general.backgroundImageSource === 2) {
      databaseStore('currBackgroundImages', 'add', {
        ...dbData,
        appearanceCode: +!localState.value.currAppearanceCode,
      })
    }
  }
  if (!dbData) {
    console.error('dbData empty')
    return
  }
  imageState.currBackgroundImageFileName = localConfig.general.backgroundImageSource === 0 ? dbData.file.name : ''
  requestIdleCallback(() => {
    const rawBlobUrl = URL.createObjectURL((dbData as BackgroundImageItem).file)
    const rawImageEle = new Image()
    rawImageEle.src = rawBlobUrl
    rawImageEle.onload = () => {
      imageState.currBackgroundImageFileObjectURL = rawBlobUrl
      isImageLoading.value = false
      console.timeEnd('RenderRawImage')
    }
  })
}

const setCurrSmallBackgroundImage = async () => {
  let dbData: BackgroundImageItem | null = null
  const storeName = localConfig.general.backgroundImageSource === 0 ? 'localBackgroundImages' : 'currBackgroundImages'
  dbData = await databaseStore(storeName, 'get', localState.value.currAppearanceCode)
  if (!dbData) {
    return
  }
  localStorage.setItem('l-firstScreen', dbData.smallBase64)
}

const deleteCurrSmallBackgroundImage = () => {
  localStorage.setItem('l-firstScreen', '')
}

const deleteCurrRawBackgroundImageInDB = async () => {
  await databaseStore('currBackgroundImages', 'delete', localState.value.currAppearanceCode)
  await databaseStore('currBackgroundImages', 'delete', +!localState.value.currAppearanceCode)
}

const refreshTodayImage = async () => {
  const oldTodayImageUrl = imageLocalState.value.imageList[0].url
  await updateImages()
  const newTodayImageUrl = imageLocalState.value.imageList[0].url
  if (newTodayImageUrl !== oldTodayImageUrl) {
    await deleteCurrRawBackgroundImageInDB()
  }
  renderRawBackgroundImage()
}

export const initBackgroundImage = () => {
  // 渲染缩略图
  const localImage = localStorage.getItem('l-firstScreen') || ''
  if (localImage) {
    imageState.currBackgroundImageFileObjectURL = localImage
  }
  // 渲染原图
  if (localConfig.general.backgroundImageSource === 2) {
    refreshTodayImage()
  } else {
    renderRawBackgroundImage()
  }
}

//  资源无变化
watch([() => localState.value.currAppearanceCode], async () => {
  if (!localConfig.general.isBackgroundImageEnabled) {
    return
  }
  deleteCurrSmallBackgroundImage()
  setCurrSmallBackgroundImage()
  renderRawBackgroundImage()
})

// 涉及资源变化
watch(
  [
    () => localConfig.general.backgroundImageSource,
    () => localConfig.general.backgroundImageNames,
    () => localConfig.general.backgroundImageHighQuality,
    () => localConfig.general.isBackgroundImageCustomUrlEnabled,
    () => localConfig.general.backgroundImageCustomUrls,
  ],
  async () => {
    if (!localConfig.general.isBackgroundImageEnabled) {
      return
    }
    deleteCurrSmallBackgroundImage()
    // 背景图来源为本地，需要独立存储预览图
    if (localConfig.general.backgroundImageSource === 0) {
      setCurrSmallBackgroundImage()
    }
    await deleteCurrRawBackgroundImageInDB()
    renderRawBackgroundImage()
  },
  {
    deep: true,
  },
)
