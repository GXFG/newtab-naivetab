<template>
  <div v-if="localState.setting.weather.forecastEnabled" id="forecast" ref="chartDom" />
</template>

<script setup lang="ts">
import { localState } from '@/logic'
</script>
