<template>
  <NConfigProvider :locale="nativeUILang" :theme="currTheme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <Content />
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import Content from './Content.vue'
import { nativeUILang, currTheme, themeOverrides } from '@/logic'
</script>
