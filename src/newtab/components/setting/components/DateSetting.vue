<template>
  <BaseComponentSetting field="date">
    <template #header>
      <NFormItem :label="$t('common.format')">
        <NInput v-model:value="globalState.setting.date.format"></NInput>
        <Tips link :content="URL_DAYJS_FORMAT" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { NFormItem, NInput } from 'naive-ui'
import { URL_DAYJS_FORMAT, globalState } from '@/logic'
</script>
