<template>
  <BaseComponentSetting cname="date">
    <template #header>
      <NFormItem :label="$t('common.format')">
        <NInput v-model:value="localConfig.date.format" />
        <Tips link :content="URL_DAYJS_FORMAT" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { URL_DAYJS_FORMAT, localConfig } from '@/logic'
</script>
