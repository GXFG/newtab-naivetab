<script setup lang="ts">
import { useMessage, useNotification, useDialog, useLoadingBar } from 'naive-ui'
import Setting from '@/newtab/components/setting/index.vue'
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
window.$dialog = useDialog()
window.$loadingBar = useLoadingBar()
</script>

<template>
  <!-- component -->
  <BackgroundImg />
  <RightClickMenu />
  <UserGuideModal />
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
