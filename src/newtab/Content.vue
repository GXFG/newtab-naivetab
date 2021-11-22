<template>
  <Setting class="app__setting" />
  <Bookmark class="app__bookmark" />
  <DigitalClock class="app__digital_clock" />
  <Calendar class="app__calendar" />
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import Setting from './components/setting/index.vue'
import Bookmark from './components/Bookmark.vue'
import DigitalClock from './components/DigitalClock.vue'
import Calendar from './components/Calendar.vue'

window.$message = useMessage()
</script>

<style>
.app__bookmark {
  position: absolute;
  top: 12%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.app__digital_clock {
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
</style>
