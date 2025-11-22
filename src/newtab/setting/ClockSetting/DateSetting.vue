<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/constants/index'
import { localConfig } from '@/logic/store'
import SettingPaneWrap from '@/newtab/setting/components/SettingPaneWrap.vue'
import Tips from '@/components/Tips.vue'
</script>

<template>
  <SettingPaneWrap widget-code="date">
    <template #header>
      <NFormItem :label="$t('common.format')">
        <NInput
          v-model:value="localConfig.date.format"
          size="small"
        />
        <Tips
          link
          :content="URL_DAYJS_FORMAT"
        />
      </NFormItem>
    </template>
  </SettingPaneWrap>
</template>
