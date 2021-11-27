<template>
  <ComponentLayout field="date">
    <NFormItem :label="$t('common.format')">
      <NInput v-model:value="globalState.setting.date.format"></NInput>
    </NFormItem>
  </ComponentLayout>

  <ElementConfig field="date" />
</template>

<script setup lang="ts">
import { NFormItem, NInput } from 'naive-ui'
import { globalState } from '@/logic'

</script>
