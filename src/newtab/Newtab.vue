<template>
  <Operation class="app__operation" />
  <Bookmark class="app__bookmark" />
  <DigitalWatch class="app__digital_watch" />
  <Calendar class="app__calendar" />
</template>

<script setup lang="ts">
import Operation from './components/Operation.vue'
import Bookmark from './components/Bookmark.vue'
import DigitalWatch from './components/DigitalWatch.vue'
import Calendar from './components/Calendar.vue'
import { downloadSetting } from '@/logic'

downloadSetting()

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
  bottom: 2%;
  left: 2%;
}
</style>
