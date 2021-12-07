<template>
  <ComponentLayout field="clockAnalog">
    <NFormItem :label="$t('common.theme')">
      <NSelect v-model:value="globalState.setting.clockAnalog.theme" :options="ANALOG_CLOCK_THEME"></NSelect>
    </NFormItem>
  </ComponentLayout>

  <ElementConfig field="clockAnalog" />
</template>

<script setup lang="ts">
import { NFormItem, NSelect } from 'naive-ui'
import { ANALOG_CLOCK_THEME, globalState } from '@/logic'

</script>
