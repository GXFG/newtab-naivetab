<template>
  <BaseComponentSetting cname="clockAnalog">
    <template #header>
      <NFormItem :label="$t('common.theme')">
        <NSelect v-model:value="localState.setting.clockAnalog.theme" :options="ANALOG_CLOCK_THEME" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { ANALOG_CLOCK_THEME, localState } from '@/logic'
</script>
