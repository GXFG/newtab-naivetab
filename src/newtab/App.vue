<template>
  <NConfigProvider id="container" :class="{ 'animation--zoom-in': localConfig.general.isLoadPageAnimationEnabled }" :locale="nativeUILang" :theme="currTheme" :theme-overrides="themeOverrides">
    <NDialogProvider>
      <NNotificationProvider>
        <NMessageProvider>
          <NLoadingBarProvider>
            <Content />
          </NLoadingBarProvider>
        </NMessageProvider>
      </NNotificationProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NNotificationProvider, NLoadingBarProvider } from 'naive-ui'
import {
  getStyleField,
  localConfig,
  nativeUILang,
  currTheme,
  themeOverrides,
  renderBackgroundImage,
  setEdgeFavicon,
  downloadConfig,
  initFirstOpen,
  handleUpdate,
  sendBookmarkDataToBg,
  handleBookmarkPending,
  startKeyboard,
  startTimer,
  stopTimer,
} from '@/logic'
import Content from '@/newtab/Content.vue'

onMounted(async () => {
  renderBackgroundImage()
  setEdgeFavicon()
  startTimer()
  startKeyboard()
  downloadConfig()
  await nextTick()
  initFirstOpen()
  sendBookmarkDataToBg()
  handleBookmarkPending()
  handleUpdate()
})

onUnmounted(() => {
  stopTimer()
})

const CNAME = 'general'
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
</script>

<style>
#container {
  font-size: v-bind(customFontSize);
  font-family: v-bind(customFontFamily);
}
</style>
