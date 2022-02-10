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
import {
  APPEARANCE_TO_CODE_MAP,
  gaEvent,
  getStyleField,
  localState,
  loadSyncSetting,
  initFirstOpen,
  checkUpdate,
  initAvailableFontList,
  startKeyboard,
  startTimer,
  stopTimer,
} from '@/logic'

onMounted(async() => {
  loadSyncSetting()
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

// custom theme
const themeOverrides: GlobalThemeOverrides = {
  common: {},
}

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

/* dragMode input */
.n-input.n-input--disabled .n-input__input-el,
.n-input.n-input--disabled .n-input__textarea-el {
  cursor: move;
}
</style>
