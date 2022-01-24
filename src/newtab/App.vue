<template>
  <NConfigProvider id="container" :locale="nativeUILang" :theme="currTheme" :theme-overrides="themeOverrides">
    <NNotificationProvider>
      <NMessageProvider>
        <Content />
      </NMessageProvider>
    </NNotificationProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import type { GlobalThemeOverrides } from 'naive-ui'
import { NConfigProvider, NMessageProvider, NNotificationProvider, darkTheme, enUS, useOsTheme, zhCN } from 'naive-ui'
import Content from './Content.vue'
import { THEME_TO_CODE_MAP, gaEvent, getStyleField, globalState, loadSyncSetting, initFirstOpen, openWhatsNewModal, startKeyboard, startTimer, stopTimer } from '@/logic'

initFirstOpen ()
openWhatsNewModal()
loadSyncSetting()
startTimer()
startKeyboard()

onUnmounted(() => {
  stopTimer()
})

gaEvent('page-home', 'view', 'view')

// theme
const osTheme = useOsTheme() // light | dark | null
const currTheme = ref()

watch(
  [
    () => osTheme.value,
    () => globalState.setting.general.theme,
  ],
  () => {
    if (globalState.setting.general.theme === 'auto') {
      globalState.localState.currThemeCode = THEME_TO_CODE_MAP[osTheme.value as any]
      currTheme.value = osTheme.value === 'dark' ? darkTheme : null
      return
    }
    globalState.localState.currThemeCode = THEME_TO_CODE_MAP[globalState.setting.general.theme]
    currTheme.value = globalState.setting.general.theme === 'dark' ? darkTheme : null
  },
  { immediate: true },
)

const themeOverrides: GlobalThemeOverrides = {
  common: {},
}

const NATIVE_UI_LOCALE_MAP = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

// UI language
const nativeUILang = ref(enUS)

watch(
  () => globalState.setting.general.lang,
  () => {
    nativeUILang.value = NATIVE_UI_LOCALE_MAP[globalState.setting.general.lang] || enUS
  },
  { immediate: true },
)

const CNAME = 'general'
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
</script>

<style>
#container {
  font-size: v-bind(customFontSize);
  font-family: v-bind(customFontFamily);
}

.icon__wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}

.setting__row-element {
  margin-left: 10px;
}

.setting__input-wrap {
  flex: 1;
  display: flex;
  justify-content: space-between;
  .setting__input_item {
    display: flex;
    align-items: center;
    &:nth-of-type(2) {
      flex: 1;
      justify-content: flex-end;
      margin-left: 10px;
    }
  }
}

.setting__input-number {
  flex: 0 0 auto;
  margin-left: 10px;
  width: 110px;
}

.setting__input-number--unit {
  flex: 0 0 auto;
  margin-left: 10px;
  width: 150px;
}
</style>
