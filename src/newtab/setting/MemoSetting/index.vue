<script setup lang="ts">
import { localConfig } from '@/logic/store'
import SettingPaneTitle from '~/newtab/setting/SettingPaneTitle.vue'
import SettingPaneWrap from '~/newtab/setting/SettingPaneWrap.vue'
</script>

<template>
  <SettingPaneTitle :title="$t('setting.memo')" />

  <SettingPaneWrap
    widget-code="memo"
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
  </SettingPaneWrap>
</template>
