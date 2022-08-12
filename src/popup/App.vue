<template>
  <NConfigProvider :locale="nativeUILang" :theme="currTheme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <Content />
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { nativeUILang, currTheme, themeOverrides } from '@/logic'
import Content from '@/popup/Content.vue'
</script>
