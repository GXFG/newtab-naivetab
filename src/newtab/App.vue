<template>
  <NConfigProvider id="container" :theme="currTheme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <Content />
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, GlobalThemeOverrides, useOsTheme, darkTheme, NMessageProvider } from 'naive-ui'
import Content from './Content.vue'
import { THEME_CODE_MAP, globalState, loadSyncSetting, initPageTitle, getCustomFontSize } from '@/logic'

loadSyncSetting()
initPageTitle()

const osTheme = useOsTheme() // light | dark | null
const currTheme = ref()

watch(() => [
  osTheme.value,
  globalState.setting.general.theme,
], () => {
  if (globalState.setting.general.theme === 'auto') {
    globalState.localState.currThemeCode = THEME_CODE_MAP[osTheme.value as any]
    currTheme.value = osTheme.value === 'dark' ? darkTheme : null
    return
  }
  globalState.localState.currThemeCode = THEME_CODE_MAP[globalState.setting.general.theme]
  currTheme.value = globalState.setting.general.theme === 'dark' ? darkTheme : null
}, {
  immediate: true,
})

const themeOverrides: GlobalThemeOverrides = {
  common: {},
}

const customFontSize = computed(() => getCustomFontSize('general'))

</script>

<style>
#container {
  font-size: v-bind(customFontSize);
  font-family: v-bind(globalState.setting.general.style.fontFamily);
}
</style>
