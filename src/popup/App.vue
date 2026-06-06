<script setup lang="ts">
import {
  registerGlobalErrorHandler,
  registerVueErrorHandler,
} from '@/logic/utils/errorHandler'
import {
  initDomStyleWatchers,
  cleanupDomStyleWatchers,
} from '@/logic/store/dom'
import Content from '@/popup/Content.vue'

onMounted(() => {
  registerGlobalErrorHandler('popup')
  registerVueErrorHandler(getCurrentInstance()!.appContext.app, 'popup')
  initDomStyleWatchers()
})

onUnmounted(() => {
  cleanupDomStyleWatchers()
})
</script>

<template>
  <Content />
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
