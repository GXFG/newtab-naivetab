<script setup lang="ts">
import { useMessage, useNotification, useDialog, useLoadingBar } from 'naive-ui'
import ChangelogModal from '@/components/ChangelogModal.vue'

import BackgroundImg from '@/newtab/components/BackgroundImg.vue'
import RightClickMenu from '@/newtab/components/RightClickMenu.vue'
import MoveableGuideLine from '@/newtab/components/moveable/MoveableGuideLine.vue'
import MoveableElementDrawer from '@/newtab/components/moveable/MoveableElementDrawer.vue'

import Setting from '@/newtab/setting/index.vue'
import KeyboardBookmark from '@/newtab/elements/bookmark/keyboard.vue'
import DigitalClock from '@/newtab/elements/clock/DigitalClock.vue'
import AnalogClock from '@/newtab/elements/clock/AnalogClock.vue'
import Date from '@/newtab/elements/date/index.vue'
import Calendar from '@/newtab/elements/calendar/index.vue'
import YearProgress from '@/newtab/elements/YearProgress/index.vue'
import Search from '@/newtab/elements/search/index.vue'
import Weather from '@/newtab/elements/weather/index.vue'
import Memo from '@/newtab/elements/memo/index.vue'
import News from '@/newtab/elements/news/index.vue'
// @@@@ add Components 3

window.$message = useMessage()
window.$notification = useNotification()
window.$dialog = useDialog()
window.$loadingBar = useLoadingBar()
</script>

<template>
  <!-- component -->
  <BackgroundImg />
  <RightClickMenu />
  <ChangelogModal />
  <MoveableGuideLine />
  <MoveableElementDrawer />

  <!-- element -->
  <Setting />
  <Weather />
  <News />
  <YearProgress />
  <Calendar />
  <KeyboardBookmark />
  <DigitalClock />
  <AnalogClock />
  <Date />
  <Memo />
  <Search />
</template>
