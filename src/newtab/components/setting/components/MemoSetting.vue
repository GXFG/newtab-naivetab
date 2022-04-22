<template>
  <BaseComponentSetting cname="memo">
    <template #header>
      <NFormItem :label="$t('memo.wordCount')">
        <NSwitch v-model:value="localConfig.memo.countEnabled" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { localConfig } from '@/logic'
</script>
