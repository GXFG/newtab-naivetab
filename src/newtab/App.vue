<template>
  <NConfigProvider
    id="container"
    :class="{ 'animation--zoom-in': localConfig.general.isLoadPageAnimationEnabled }"
    :locale="nativeUILang"
    :theme="currTheme"
    :theme-overrides="themeOverrides"
  >
    <NNotificationProvider>
      <NMessageProvider>
        <NLoadingBarProvider>
          <Content />
        </NLoadingBarProvider>
      </NMessageProvider>
    </NNotificationProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import type { GlobalThemeOverrides } from 'naive-ui'
import { NConfigProvider, NMessageProvider, NNotificationProvider, NLoadingBarProvider, darkTheme, enUS, useOsTheme, zhCN } from 'naive-ui'
import Content from './Content.vue'
import {
  APPEARANCE_TO_CODE_MAP,
  gaEvent,
  getStyleField,
  localConfig,
  localState,
  downloadConfig,
  initFirstOpen,
  checkUpdate,
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
  gaEvent('page-home', 'view', 'view')
})

onUnmounted(() => {
  stopTimer()
})

// theme
const osTheme = useOsTheme() // light | dark | null
const currTheme = ref()

watch(
  [() => osTheme.value, () => localConfig.general.appearance],
  () => {
    if (localConfig.general.appearance === 'auto') {
      localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[osTheme.value as any]
      currTheme.value = osTheme.value === 'dark' ? darkTheme : null
      return
    }
    localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[localConfig.general.appearance]
    currTheme.value = localConfig.general.appearance === 'dark' ? darkTheme : null
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
  () => localConfig.general.lang,
  () => {
    nativeUILang.value = NATIVE_UI_LOCALE_MAP[localConfig.general.lang] || enUS
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
