<template>
  <Setting class="app__setting" />
  <Bookmark class="app__bookmark" />
  <DigitalWatch class="app__digital_watch" />
  <Calendar class="app__calendar" />
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui'
import Setting from './components/Setting.vue'
import Bookmark from './components/Bookmark.vue'
import DigitalWatch from './components/DigitalWatch.vue'
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
</style>
