<template>
  <NConfigProvider :theme="currTheme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <Content />
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, GlobalThemeOverrides, useOsTheme, darkTheme, NMessageProvider } from 'naive-ui'
import Content from './Content.vue'
import { downloadSetting } from '@/logic'

downloadSetting()

const osThemeRef = useOsTheme()
const currTheme = computed(() => (osThemeRef.value === 'dark' ? darkTheme : null))

const themeOverrides: GlobalThemeOverrides = {
  common: {
    baseColor: '#78909c',
    primaryColor: '#78909c',
    primaryColorHover: '#78909c',
    primaryColorPressed: '#78909c',
    primaryColorSuppl: '#78909c',
  },
}

</script>
