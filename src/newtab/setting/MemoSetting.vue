<script setup lang="ts">
import { localConfig } from '@/logic/store'
import BaseComponentSetting from '@/newtab/components/form/BaseComponentSetting.vue'
</script>

<template>
  <BaseComponentSetting
    cname="memo"
    :width-range="[100, 1000]"
    :height-range="[100, 1000]"
  >
    <template #header>
      <NFormItem :label="$t('memo.wordCount')">
        <NSwitch v-model:value="localConfig.memo.countEnabled" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
