<template>
  <Setting />
  <Bookmark />
  <DigitalClock />
  <Calendar />
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import Setting from './components/setting/index.vue'
import DigitalClock from './components/clock/DigitalClock.vue'
import Bookmark from './components/Bookmark.vue'
import Calendar from './components/Calendar.vue'

window.$message = useMessage()
</script>

<style>
</style>
