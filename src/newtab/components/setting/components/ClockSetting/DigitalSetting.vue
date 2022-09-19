<script setup lang="ts">
import { URL_DAYJS_FORMAT, localConfig } from '@/logic'
</script>

<template>
  <BaseComponentSetting cname="clockDigital">
    <template #header>
      <NFormItem :label="$t('common.format')">
        <NInput v-model:value="localConfig.clockDigital.format" />
        <Tips link :content="URL_DAYJS_FORMAT" />
      </NFormItem>
      <NFormItem :label="$t('clock.apMark')">
        <NSwitch v-model:value="localConfig.clockDigital.unitEnabled" />
        <NSlider
          v-if="localConfig.clockDigital.unitEnabled"
          v-model:value="localConfig.clockDigital.unit.fontSize"
          class="setting__row-element"
          :step="1"
          :min="12"
          :max="200"
        />
        <NInputNumber
          v-if="localConfig.clockDigital.unitEnabled"
          v-model:value="localConfig.clockDigital.unit.fontSize"
          class="setting__input-number"
          :min="12"
          :step="1"
        />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
