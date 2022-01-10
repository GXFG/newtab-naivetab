import dayjs from 'dayjs'
import { globalState } from './store'
import { useStorageLocal } from '@/composables/useStorageLocal'
import http from '@/lib/http'

export const imageState = ref(useStorageLocal('data-images', {
  imageList: [] as TImageItem[],
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

const getBingImages = async() => {
  try {
    isImageListLoading.value = true
    const data: any = await http({
      method: 'get',
      url: 'https://cn.bing.com/HPImageArchive.aspx',
      params: {
        format: 'js',
        idx: 0, // idx=0 表示是显示当天的时间，1表示昨天...，支持查看历史 15 天以内的图片
        n: 8, // 1-8 返回请求数量，目前最多一次获取8张
      },
    })
    isImageListLoading.value = false
    imageState.value.syncDate = dayjs().format('YYYY-MM-DD')
    imageState.value.imageList = data.images
  } catch (e) {
    isImageListLoading.value = false
  }
}

const renderBackgroundImage = async(initPage: boolean, clearStyle = false) => {
  await nextTick()
  isImageLoading.value = true
  const backgroundEl: any = document.querySelector('#background__container')
  if (clearStyle) {
    backgroundEl.style = ''
    return
  }
  let currUrl = ''
  if (globalState.style.general.backgroundImageSource === 0) {
    currUrl = imageState.value.localBackgroundBase64
  } else {
    if (initPage && globalState.style.general.backgroundImageUrl.length !== 0) {
      // 初始化页面时且本地有图片缓存时，读取上一次的设置
      currUrl = globalState.style.general.backgroundImageUrl
    } else {
      let index = imageState.value.imageList.findIndex((item: TImageItem) => item.urlbase === globalState.style.general.backgroundImageId)
      index = index === -1 ? 0 : index
      const urlbase = imageState.value.imageList[index].urlbase
      const httpUrl = getImageUrlFromBing(urlbase)
      globalState.style.general.backgroundImageUrl = httpUrl
      currUrl = httpUrl
    }
  }
  const imgEle = new Image()
  imgEle.src = currUrl
  // 图片加载完成后再切换背景图
  imgEle.onload = () => {
    let style = `background-image: url(${currUrl});`
    style += 'background-size: cover;background-repeat: no-repeat;'
    style += `opacity: ${globalState.style.general.bgOpacity};`
    style += `filter: blur(${globalState.style.general.bgBlur}px);`
    backgroundEl.style = style
    isImageLoading.value = false
  }
  imgEle.onerror = () => {
    isImageLoading.value = false
  }
}

watch([
  () => globalState.style.general.backgroundImageSource,
  () => globalState.style.general.backgroundImageId,
  () => imageState.value.localBackgroundBase64,
  () => globalState.style.general.backgroundImageUrl,
  () => globalState.style.general.bgOpacity,
  () => globalState.style.general.bgBlur,
], () => {
  if (!globalState.style.general.isBackgroundImageEnabled) {
    return
  }
  renderBackgroundImage(false)
})

watch(() => globalState.style.general.isBackgroundImageEnabled, async(isEnabled) => {
  if (imageState.value.imageList.length === 0) {
    await getBingImages()
  }
  renderBackgroundImage(true, !isEnabled)
}, { immediate: true })

export const onRefreshImageList = () => {
  getBingImages()
}
