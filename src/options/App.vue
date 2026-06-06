<script setup lang="ts">
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
