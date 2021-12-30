<template>
  <WhatsNew />
  <AuxiliaryLine />
  <RightClickMenu />
  <KeyboardBookmark />
  <DigitalClock />
  <AnalogClock />
  <Date />
  <Calendar />
  <Weather />
  <Setting />
</template>

<script setup lang="ts">
import { useMessage, useNotification } from 'naive-ui'
import KeyboardBookmark from './components/bookmark/keyboard.vue'
import DigitalClock from './components/clock/DigitalClock.vue'
import AnalogClock from './components/clock/AnalogClock.vue'
import Date from './components/date/index.vue'
import Calendar from './components/calendar/index.vue'
import Weather from './components/weather/index.vue'
import Setting from './components/setting/index.vue'

window.$message = useMessage()
window.$notification = useNotification()

</script>

<style>
</style>
