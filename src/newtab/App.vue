<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NNotificationProvider, NLoadingBarProvider } from 'naive-ui'
import pkg from '../../package.json'
import {
  getStyleField,
  localConfig,
  nativeUILang,
  currTheme,
  themeOverrides,
  initBackgroundImage,
  setEdgeFavicon,
  startKeydown,
  startTimer,
  stopTimer,
  onPageFocus,
  handleStateResetAndUpdate,
  handleMissedUploadConfig,
  loadRemoteConfig,
  handleFirstOpen,
  handleAppUpdate,
  gaProxy,
} from '@/logic'
import Content from '@/newtab/Content.vue'

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
  setEdgeFavicon()
  handleStateResetAndUpdate()
  startTimer()
  startKeydown()
  await handleMissedUploadConfig()
  await loadRemoteConfig()
  await nextTick()
  handleFirstOpen()
  handleAppUpdate()
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
            <div tabindex="100" @focus="onPageFocus">
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
