<template>
  <div v-if="localConfig.weather.forecastEnabled" id="forecast" ref="chartDom" />
</template>

<script setup lang="ts">
import { localConfig } from '@/logic'
</script>
