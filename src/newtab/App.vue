<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NNotificationProvider, NLoadingBarProvider } from 'naive-ui'
import { log } from '@/logic/util'
import { gaProxy } from '@/logic/gtag'
import { FOCUE_ELEMENT_SELECTOR_MAP } from '@/logic/const'
import { startKeydown, startTimer, stopTimer, onPageFocus } from '@/logic/task'
import { handleWatchLocalConfigChange, handleMissedUploadConfig, loadRemoteConfig } from '@/logic/storage'
import { handleFirstOpen } from '@/logic/guide'
import { getStyleField, localConfig, nativeUILang, currTheme, themeOverrides, handleStateResetAndUpdate, handleAppUpdate, setEdgeFavicon } from '@/logic/store'
import { initBackgroundImage } from '@/logic/image'
import { initBookmarkData } from '@/logic/bookmark'
import { handleWatchNewsConfigChange } from '@/logic/news'
import { handleWatchWeatherConfigChange } from '@/logic/weather'
import { updatePoetry } from '@/logic/poetry'
import Content from '@/newtab/Content.vue'

if (localConfig.general.openPageFocusElement !== 'default') {
  if (location.search !== '?focus') {
    location.search = '?focus'
    throw new Error()
  }
}

const handleFocusPage = () => {
  if (localConfig.general.openPageFocusElement === 'default') {
    return
  }
  const selector = FOCUE_ELEMENT_SELECTOR_MAP[localConfig.general.openPageFocusElement]
  const focusEle = document.querySelector(selector) as HTMLElement | null
  if (focusEle && focusEle.focus) {
    focusEle.focus()
  }
}

const onDot = () => {
  const browserPlatform = navigator.userAgentData?.platform || navigator.platform || 'unknown'
  let browserBrand = 'unknown'
  let browserVersion = 'unknown'
  if (navigator.userAgentData?.brands?.length) {
    const [brand] = navigator.userAgentData.brands.slice(-1)
    browserBrand = brand.brand
    browserVersion = brand.version
  } else {
    const ua = navigator.userAgent
    const firefoxMatch = ua.match(/Firefox\/(\d+\.\d+)/)
    if (firefoxMatch) {
      browserBrand = 'Firefox'
      browserVersion = firefoxMatch[1]
    } else {
      const chromeMatch = ua.match(/(Chrome|Edg)\/(\d+\.\d+)/)
      if (chromeMatch) {
        browserBrand = chromeMatch[1].replace('Edg', 'Microsoft Edge')
        browserVersion = chromeMatch[2]
      }
    }
  }

  gaProxy('view', ['newtab'], {
    version: window.appVersion,
    userAgent: navigator.userAgent,
    platform: browserPlatform,
    browser: `${browserBrand}_${browserVersion}`,
  })
  log('platform', `${browserPlatform}_${browserBrand}_${browserVersion}`)
}

onMounted(async () => {
  initBackgroundImage()
  setEdgeFavicon()
  handleStateResetAndUpdate()
  startTimer()
  startKeydown()
  handleWatchLocalConfigChange()
  initBookmarkData()
  await handleMissedUploadConfig()
  await loadRemoteConfig()
  await nextTick()
  handleFirstOpen()
  handleAppUpdate()
  handleWatchNewsConfigChange()
  handleWatchWeatherConfigChange()
  handleFocusPage()
  updatePoetry()
  onDot()
})

onUnmounted(() => {
  stopTimer()
})

const pageAnimationClass = computed(() => {
  if (!localConfig.general.isLoadPageAnimationEnabled) {
    return ''
  }
  return `animation--${localConfig.general.loadPageAnimationType}`
})

const CNAME = 'general'
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
</script>

<template>
  <NConfigProvider
    id="container"
    :class="pageAnimationClass"
    :locale="nativeUILang"
    :theme="currTheme"
    :theme-overrides="themeOverrides"
  >
    <NDialogProvider>
      <NNotificationProvider>
        <NMessageProvider>
          <NLoadingBarProvider>
            <div
              id="container__main"
              tabindex="100"
              @focus="onPageFocus"
            >
              <Content />
            </div>
          </NLoadingBarProvider>
        </NMessageProvider>
      </NNotificationProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>

<style>
#container {
  width: 100vw;
  height: 100vh;
  font-size: v-bind(customFontSize);
  font-family: v-bind(customFontFamily);
  #container__main {
    width: 100vw;
    height: 100vh;
  }
}
</style>
