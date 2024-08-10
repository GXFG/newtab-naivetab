<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NNotificationProvider, NLoadingBarProvider } from 'naive-ui'
import { gaProxy } from '@/logic/gtag'
import { FOCUE_ELEMENT_SELECTOR_MAP } from '@/logic/const'
import { startKeydown, startTimer, stopTimer, onPageFocus } from '@/logic/task'
import { handleWatchLocalConfigChange, handleMissedUploadConfig, loadRemoteConfig } from '@/logic/storage'
import { handleFirstOpen } from '@/logic/guide'
import { getStyleField, localConfig, nativeUILang, currTheme, themeOverrides, handleStateResetAndUpdate, handleAppUpdate } from '@/logic/store'
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
  const [brand] = navigator.userAgentData?.brands.slice(-1) || []
  gaProxy('view', ['newtab'], {
    version: window.appVersion,
    userAgent: navigator.userAgent,
    platform: navigator.userAgentData?.platform,
    browser: `${brand.brand}_${brand.version}`,
  })
}

onMounted(async () => {
  initBackgroundImage()
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

const animationClassName = computed(() => {
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
    :class="animationClassName"
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
  font-size: v-bind(customFontSize);
  font-family: v-bind(customFontFamily);
}
</style>
