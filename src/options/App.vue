<script setup lang="ts">
import { NConfigProvider, NDialogProvider } from 'naive-ui'
import { nativeUILang, currTheme, themeOverrides } from '@/logic/store/theme'
import {
  registerGlobalErrorHandler,
  registerVueErrorHandler,
} from '@/logic/utils/errorHandler'
import {
  initDomStyleWatchers,
  cleanupDomStyleWatchers,
} from '@/logic/store/dom'
import Content from '@/options/Content.vue'

onMounted(() => {
  registerGlobalErrorHandler('options')
  registerVueErrorHandler(getCurrentInstance()!.appContext.app, 'options')
  initDomStyleWatchers()
})

onUnmounted(() => {
  cleanupDomStyleWatchers()
})
</script>

<template>
  <NConfigProvider
    :locale="nativeUILang"
    :theme="currTheme"
    :theme-overrides="themeOverrides"
  >
    <NDialogProvider>
      <Content />
    </NDialogProvider>
  </NConfigProvider>
</template>

<style>
body {
  font-family:
    Helvetica Neue,
    Helvetica,
    Arial,
    PingFang SC,
    Heiti SC,
    Hiragino Sans GB,
    Microsoft YaHei,
    sans-serif;
}
</style>
