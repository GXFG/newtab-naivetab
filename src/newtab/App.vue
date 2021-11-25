<template>
  <div id="container">
    <NConfigProvider :theme="currTheme" :theme-overrides="themeOverrides">
      <NMessageProvider>
        <Content />
      </NMessageProvider>
    </NConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { NConfigProvider, GlobalThemeOverrides, useOsTheme, darkTheme, NMessageProvider } from 'naive-ui'
import Content from './Content.vue'
import { THEME_CODE_MAP, globalState, loadSyncSetting, initPageTitle, getCustomFontSize } from '@/logic'

loadSyncSetting()
initPageTitle()

const osTheme = useOsTheme() // light | dark | null
const currTheme = computed(() => (osTheme.value === 'dark' ? darkTheme : null))

watch(() => osTheme.value, (themeName) => {
  if (globalState.setting.general.theme !== 'auto') {
    globalState.localState.currThemeCode = THEME_CODE_MAP[globalState.setting.general.theme]
    return
  }
  globalState.localState.currThemeCode = THEME_CODE_MAP[themeName as any] || 2
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
