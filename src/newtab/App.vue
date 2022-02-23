<template>
  <NConfigProvider
    id="container"
    :class="{ 'animation--zoom-in': localState.setting.general.isLoadPageAnimationEnabled }"
    :locale="nativeUILang"
    :theme="currTheme"
    :theme-overrides="themeOverrides"
  >
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
import {
  APPEARANCE_TO_CODE_MAP,
  gaEvent,
  getStyleField,
  localState,
  downloadConfig,
  initFirstOpen,
  checkUpdate,
  initAvailableFontList,
  startKeyboard,
  startTimer,
  stopTimer,
} from '@/logic'

onMounted(async() => {
  downloadConfig()
  startTimer()
  startKeyboard()
  await nextTick()
  initFirstOpen()
  checkUpdate()
  initAvailableFontList()
  gaEvent('page-home', 'view', 'view')
})

onUnmounted(() => {
  stopTimer()
})

// theme
const osTheme = useOsTheme() // light | dark | null
const currTheme = ref()

watch(
  [() => osTheme.value, () => localState.setting.general.appearance],
  () => {
    if (localState.setting.general.appearance === 'auto') {
      localState.common.currAppearanceCode = APPEARANCE_TO_CODE_MAP[osTheme.value as any]
      currTheme.value = osTheme.value === 'dark' ? darkTheme : null
      return
    }
    localState.common.currAppearanceCode = APPEARANCE_TO_CODE_MAP[localState.setting.general.appearance]
    currTheme.value = localState.setting.general.appearance === 'dark' ? darkTheme : null
  },
  { immediate: true },
)

// UI language
const nativeUILang = ref(enUS)
const NATIVE_UI_LOCALE_MAP = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

watch(
  () => localState.setting.general.lang,
  () => {
    nativeUILang.value = NATIVE_UI_LOCALE_MAP[localState.setting.general.lang] || enUS
  },
  { immediate: true },
)

const CNAME = 'general'
const customPrimaryColor = getStyleField(CNAME, 'primaryColor')
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: customPrimaryColor.value,
    primaryColorSuppl: customPrimaryColor.value,
    primaryColorHover: '#7f8c8d',
    primaryColorPressed: '#57606f',
  },
}
</script>

<style>
#container {
  font-size: v-bind(customFontSize);
  font-family: v-bind(customFontFamily);
}
</style>
