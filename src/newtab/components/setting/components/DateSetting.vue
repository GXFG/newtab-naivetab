<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/const'
import { localConfig } from '@/logic/store'
</script>

<template>
  <BaseComponentSetting cname="date">
    <template #header>
      <NFormItem :label="$t('common.format')">
        <NInput v-model:value="localConfig.date.format" />
        <Tips
          link
          :content="URL_DAYJS_FORMAT"
        />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
