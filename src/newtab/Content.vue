<template>
  <!-- component -->
  <BackgroundImg />
  <RightClickMenu />
  <HelpModal />
  <WhatsNewModal />
  <SponsorModal />
  <MoveableGuideLine />
  <MoveableElementDrawer />
  <!-- element -->
  <Setting />
  <News />
  <Calendar />
  <KeyboardBookmark />
  <Memo />
  <DigitalClock />
  <AnalogClock />
  <Date />
  <Weather />
  <Search />
</template>

<script setup lang="ts">
import { useMessage, useNotification, useLoadingBar } from 'naive-ui'
import Setting from './components/setting/index.vue'
import News from '@/newtab/components/news/index.vue'
import Calendar from '@/newtab/components/calendar/index.vue'
import KeyboardBookmark from '@/newtab/components/bookmark/keyboard.vue'
import Memo from '@/newtab/components/memo/index.vue'
import DigitalClock from '@/newtab/components/clock/DigitalClock.vue'
import AnalogClock from '@/newtab/components/clock/AnalogClock.vue'
import Date from '@/newtab/components/date/index.vue'
import Weather from '@/newtab/components/weather/index.vue'
import Search from '@/newtab/components/search/index.vue'

window.$message = useMessage()
window.$notification = useNotification()
window.$loadingBar = useLoadingBar()
</script>
