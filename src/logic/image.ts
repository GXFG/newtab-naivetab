import { useLocalStorage } from '@vueuse/core'
import dayjs from 'dayjs'
import { globalState } from './store'
import http from '@/lib/http'

export const imageState = ref(useLocalStorage('images', {
  imageList: [] as any,
  syncDate: 0,
  dayOffsetNum: 0,
  currImageIndex: 0,
  localBackgroundBase64: '',
}, { listenToStorageChanges: true }))

const getImageUrl = (url: string) => `http://cn.bing.com/${url}`

/**
 *  idx=0 表示是显示当天的时间，1表示昨天...，支持查看历史 15 天以内的图片
 */
const getBingImages = async() => {
  const data: any = await http({
    method: 'get',
    url: 'https://cn.bing.com/HPImageArchive.aspx',
    params: {
      format: 'js',
      idx: imageState.value.dayOffsetNum,
      n: 10,
    },
  })
  imageState.value.syncDate = dayjs().date()
  imageState.value.imageList = data.images
  imageState.value.currImageIndex = 0
  globalState.style.general.backgroundImageUrl = getImageUrl(imageState.value.imageList[0].url)
}

const renderBackgroundImage = async(clearStyle = false) => {
  await nextTick()
  const appEl: any = document.querySelector('#background')
  if (clearStyle) {
    appEl.style = ''
    return
  }
  const currUrl = globalState.style.general.backgroundImageSource === 0 ? imageState.value.localBackgroundBase64 : globalState.style.general.backgroundImageUrl
  let style = `background-image: url(${currUrl});`
  style += 'background-size: cover;background-repeat: no-repeat;'
  style += `opacity: ${globalState.style.general.bgOpacity};`
  style += `filter: blur(${globalState.style.general.bgBlur}px);`
  appEl.style = style
}

watch([
  () => globalState.style.general.backgroundImageSource,
  () => imageState.value.localBackgroundBase64,
  () => globalState.style.general.backgroundImageUrl,
  () => globalState.style.general.bgOpacity,
  () => globalState.style.general.bgBlur,
], () => {
  renderBackgroundImage()
})

watch(() => globalState.style.general.isBackgroundImageEnabled, (value) => {
  renderBackgroundImage(!value)
  if (!value || imageState.value.syncDate === dayjs().date()) {
    return
  }
  imageState.value.dayOffsetNum = 0
  getBingImages()
}, { immediate: true })

export const onSwitchImage = () => {
  if (imageState.value.currImageIndex >= imageState.value.imageList.length - 1) {
    imageState.value.dayOffsetNum += 1
    getBingImages()
    return
  }
  imageState.value.currImageIndex += 1
  const url = imageState.value.imageList[imageState.value.currImageIndex].url
  globalState.style.general.backgroundImageUrl = getImageUrl(url)
}
