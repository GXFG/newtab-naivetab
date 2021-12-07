<template>
  <Setting />
  <Bookmark />
  <DigitalClock />
  <AnalogClock />
  <Date />
  <Calendar />
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import Setting from './components/setting/index.vue'
import Bookmark from './components/Bookmark.vue'
import DigitalClock from './components/clock/DigitalClock.vue'
import AnalogClock from './components/clock/AnalogClock.vue'
import Date from './components/Date.vue'
import Calendar from './components/Calendar.vue'

window.$message = useMessage()
</script>

<style>
</style>
