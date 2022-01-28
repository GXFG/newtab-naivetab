<template>
  <BaseComponentSetting cname="memo">
    <template #header>
      <NFormItem :label="$t('memo.wordCount')">
        <NSwitch v-model:value="globalState.setting.memo.countEnabled" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { globalState } from '@/logic'
</script>
