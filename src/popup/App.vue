<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { nativeUILang, currTheme, themeOverrides } from '@/logic/store'
import Content from '@/popup/Content.vue'
</script>

<template>
  <NConfigProvider
    :locale="nativeUILang"
    :theme="currTheme"
    :theme-overrides="themeOverrides"
  >
    <NMessageProvider>
      <Content />
    </NMessageProvider>
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
