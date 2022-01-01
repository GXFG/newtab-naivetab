import { useLocalStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import { globalState } from './store'
import http from '@/lib/http'

export const imageState = ref(useLocalStorage('images', {
  imageList: [] as any,
  syncDate: 0,
  dayOffsetNum: 0,
  currImageIndex: 0,
  localBackgroundFileName: '',
  localBackgroundBase64: '',
}, { listenToStorageChanges: true }))

export const currBackgroundImageId = computed(() => {
  const tempList = globalState.style.general.backgroundImageUrl.split('?')
  const tempParamList = tempList[1].split('=')
  const currId = tempParamList[1].slice(0, -8)
  return currId
})

// size: UHD, 1920x1080, 1366x768
export const getImageUrlFromBing = (url: string, size = 'UHD'): string => `http://cn.bing.com/${url}_${size}.jpg`

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
    imageState.value.syncDate = dayjs().date()
    imageState.value.imageList = data.images
  } catch (e) {
    isImageListLoading.value = false
  }
}

const renderBackgroundImage = async(clearStyle = false) => {
  await nextTick()
  const backgroundEl: any = document.querySelector('#background')
  if (clearStyle) {
    backgroundEl.style = ''
    return
  }
  const urlbase = imageState.value.imageList[imageState.value.currImageIndex].urlbase
  const httpUrl = getImageUrlFromBing(urlbase)
  const currUrl = globalState.style.general.backgroundImageSource === 0 ? imageState.value.localBackgroundBase64 : httpUrl
  globalState.style.general.backgroundImageUrl = httpUrl
  let style = `background-image: url(${currUrl});`
  style += 'background-size: cover;background-repeat: no-repeat;'
  style += `opacity: ${globalState.style.general.bgOpacity};`
  style += `filter: blur(${globalState.style.general.bgBlur}px);`
  backgroundEl.style = style
}

watch([
  () => globalState.style.general.backgroundImageSource,
  () => imageState.value.currImageIndex,
  () => imageState.value.localBackgroundBase64,
  () => globalState.style.general.backgroundImageUrl,
  () => globalState.style.general.bgOpacity,
  () => globalState.style.general.bgBlur,
], () => {
  renderBackgroundImage()
})

watch(() => globalState.style.general.isBackgroundImageEnabled, async(value) => {
  if (imageState.value.imageList.length === 0) {
    await getBingImages()
  }
  renderBackgroundImage(!value)
}, { immediate: true })

export const onRefreshImageList = () => {
  getBingImages()
}
