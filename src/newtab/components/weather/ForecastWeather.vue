<template>
  <div v-if="globalState.setting.weather.forecastEnabled" id="forecast" ref="chartDom"></div>
</template>

<script setup lang="ts">
import { globalState } from '@/logic'
</script>
