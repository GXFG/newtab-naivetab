<script setup lang="ts">
import { localConfig } from '@/logic'

const beginsList = computed(() => ([
  { label: window.$t('calendar.monday'), value: 1 },
  { label: window.$t('calendar.sunday'), value: 7 },
]))
</script>

<template>
  <BaseComponentSetting cname="calendar">
    <template #header>
      <NFormItem :label="$t('calendar.weekBeginsOn')">
        <NSelect v-model:value="localConfig.calendar.weekBeginsOn" :options="beginsList" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
