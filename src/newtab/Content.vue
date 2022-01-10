<template>
  <!-- component -->
  <BackgroundImg />
  <RightClickMenu />
  <HelpModal />
  <WhatsNewModal />
  <MoveableTool />
  <MoveableLine />
  <!-- element -->
  <KeyboardBookmark />
  <DigitalClock />
  <AnalogClock />
  <Date />
  <Calendar />
  <Search />
  <Weather />
  <Setting />
</template>

<script setup lang="ts">
import { useMessage, useNotification } from 'naive-ui'
import Setting from './components/setting/index.vue'
import KeyboardBookmark from '@/newtab/components/bookmark/keyboard.vue'
import DigitalClock from '@/newtab/components/clock/DigitalClock.vue'
import AnalogClock from '@/newtab/components/clock/AnalogClock.vue'
import Date from '@/newtab/components/date/index.vue'
import Calendar from '@/newtab/components/calendar/index.vue'
import Search from '@/newtab/components/search/index.vue'
import Weather from '@/newtab/components/weather/index.vue'

window.$message = useMessage()
window.$notification = useNotification()
</script>
