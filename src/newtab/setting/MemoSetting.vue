<script setup lang="ts">
import { localConfig } from '@/logic/store'
import BaseComponentCardTitle from '@/newtab/components/form/BaseComponentCardTitle.vue'
import BaseComponentSetting from '@/newtab/components/form/BaseComponentSetting.vue'
</script>

<template>
  <BaseComponentCardTitle :title="$t('setting.memo')" />

  <BaseComponentSetting
    cname="memo"
    :width-range="[100, 1000]"
    :height-range="[100, 1000]"
  >
    <template #header>
      <NFormItem :label="$t('memo.wordCount')">
        <NSwitch
          v-model:value="localConfig.memo.countEnabled"
          size="small"
        />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
