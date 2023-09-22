<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NNotificationProvider, NLoadingBarProvider } from 'naive-ui'
import { gaProxy } from '@/logic/gtag'
import { startKeydown, startTimer, stopTimer, onPageFocus } from '@/logic/task'
import { handleWatchLocalConfigChange, handleMissedUploadConfig, loadRemoteConfig } from '@/logic/storage'
import { handleFirstOpen } from '@/logic/guide'
import { getStyleField, localConfig, nativeUILang, currTheme, themeOverrides, handleStateResetAndUpdate, handleAppUpdate } from '@/logic/store'
import { initBackgroundImage } from '@/logic/image'
import { handleWatchNewsConfigChange } from '@/logic/news'
import { handleWatchWeatherConfigChange } from '@/logic/weather'
import Content from '@/newtab/Content.vue'
import pkg from '../../package.json'

const onDot = () => {
  const [brand] = navigator.userAgentData?.brands.slice(-1) || []
  gaProxy('view', ['newtab'], {
    version: pkg.version,
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
  await handleMissedUploadConfig()
  await loadRemoteConfig()
  await nextTick()
  handleFirstOpen()
  handleAppUpdate()
  handleWatchNewsConfigChange()
  handleWatchWeatherConfigChange()
  onDot()
})

onUnmounted(() => {
  stopTimer()
})

const CNAME = 'general'
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
</script>

<template>
  <NConfigProvider
    id="container"
    :class="{ 'animation--zoom-in': localConfig.general.isLoadPageAnimationEnabled }"
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
