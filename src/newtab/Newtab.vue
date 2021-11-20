<template>
  <n-config-provider :theme="currTheme" :theme-overrides="themeOverrides">
    <Setting class="app__setting" />
    <Bookmark class="app__bookmark" />
    <DigitalWatch class="app__digital_watch" />
    <Calendar class="app__calendar" />
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, GlobalThemeOverrides, useOsTheme, darkTheme } from 'naive-ui'
import Setting from './components/Setting.vue'
import Bookmark from './components/Bookmark.vue'
import DigitalWatch from './components/DigitalWatch.vue'
import Calendar from './components/Calendar.vue'
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

<style>
#app {
  transition: all 0.3s ease;
  .app__bookmark {
    position: absolute;
    top: 12%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .app__digital_watch {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .app__calendar {
    position: absolute;
    bottom: 1.5%;
    left: 1.5%;
  }
}
</style>
