<script setup lang="ts">
import { localConfig } from '@/logic'
</script>

<template>
  <BaseComponentSetting cname="memo" :widthRange="[100, 1000]" :heightRange="[100, 1000]">
    <template #header>
      <NFormItem :label="$t('memo.wordCount')">
        <NSwitch v-model:value="localConfig.memo.countEnabled" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
