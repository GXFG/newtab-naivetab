<template>
  <NConfigProvider
    id="container"
    :theme="currTheme"
    :theme-overrides="themeOverrides"
    :locale="nativeUiLocale"
  >
    <NNotificationProvider>
      <NMessageProvider>
        <Content />
      </NMessageProvider>
    </NNotificationProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { NConfigProvider, useOsTheme, darkTheme, GlobalThemeOverrides, zhCN, enUS, NMessageProvider, NNotificationProvider } from 'naive-ui'
import Content from './Content.vue'
import { gaEvent, THEME_TO_CODE_MAP, globalState, changeLogNotify, loadSyncSetting, initPageTitle, formatNumWithPixl } from '@/logic'

changeLogNotify()
loadSyncSetting()
initPageTitle()

gaEvent('page-home', 'view', 'view')

const osTheme = useOsTheme() // light | dark | null
const currTheme = ref()

watch(() => [
  osTheme.value,
  globalState.setting.general.theme,
], () => {
  if (globalState.setting.general.theme === 'auto') {
    globalState.localState.currThemeCode = THEME_TO_CODE_MAP[osTheme.value as any]
    currTheme.value = osTheme.value === 'dark' ? darkTheme : null
    return
  }
  globalState.localState.currThemeCode = THEME_TO_CODE_MAP[globalState.setting.general.theme]
  currTheme.value = globalState.setting.general.theme === 'dark' ? darkTheme : null
}, { immediate: true })

const themeOverrides: GlobalThemeOverrides = {
  common: {},
}

const NATIVE_UI_LOCALE_MAP = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

const nativeUiLocale = ref(enUS)

watch(() => globalState.setting.general.lang, () => {
  nativeUiLocale.value = NATIVE_UI_LOCALE_MAP[globalState.setting.general.lang] || enUS
}, { immediate: true })

const customFontSize = computed(() => formatNumWithPixl('general', 'fontSize'))

</script>

<style>
#container {
  font-size: v-bind(customFontSize);
  font-family: v-bind(globalState.style.general.fontFamily);
}

.setting__row-element {
  margin-left: 10px;
}

.setting__input_wrap {
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

.setting__input_label {
  margin-left: 10px;
}

.setting__input_number {
  flex: 0 0 auto;
  margin-left: 10px;
  width: 90px;
}

.setting__input_number--unit {
  flex: 0 0 auto;
  margin-left: 10px;
  width: 150px;
}
</style>
