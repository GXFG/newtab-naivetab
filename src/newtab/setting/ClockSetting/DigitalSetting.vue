<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/const'
import { localConfig } from '@/logic/store'
import BaseComponentSetting from '@/newtab/components/form/BaseComponentSetting.vue'
import Tips from '@/components/Tips.vue'
</script>

<template>
  <BaseComponentSetting cname="clockDigital">
    <template #header>
      <NFormItem :label="$t('common.format')">
        <NInput
          v-model:value="localConfig.clockDigital.format"
          size="small"
        />
        <Tips
          link
          :content="URL_DAYJS_FORMAT"
        />
      </NFormItem>

      <NFormItem :label="$t('clock.apMark')">
        <NSwitch
          v-model:value="localConfig.clockDigital.unitEnabled"
          size="small"
        />
        <NSlider
          v-if="localConfig.clockDigital.unitEnabled"
          v-model:value="localConfig.clockDigital.unit.fontSize"
          class="setting__item-ml"
          :step="1"
          :min="5"
          :max="200"
          :tooltip="false"
        />
        <NInputNumber
          v-if="localConfig.clockDigital.unitEnabled"
          v-model:value="localConfig.clockDigital.unit.fontSize"
          class="setting__item-element setting__input-number"
          size="small"
          :min="5"
          :step="1"
        />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
