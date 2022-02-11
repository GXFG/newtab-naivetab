<template>
  <BaseComponentSetting cname="clockDigital">
    <template #header>
      <NFormItem :label="$t('common.format')">
        <NInput v-model:value="localState.setting.clockDigital.format" />
        <Tips link :content="URL_DAYJS_FORMAT" />
      </NFormItem>
      <NFormItem :label="$t('clock.apMark')">
        <NSwitch v-model:value="localState.setting.clockDigital.unitEnabled" />
        <NSlider
          v-if="localState.setting.clockDigital.unitEnabled"
          v-model:value="localState.style.clockDigital.unit.fontSize"
          class="setting__row-element"
          :step="1"
          :min="12"
          :max="200"
        />
        <NInputNumber
          v-if="localState.setting.clockDigital.unitEnabled"
          v-model:value="localState.style.clockDigital.unit.fontSize"
          class="setting__input-number"
          :min="12"
          :step="1"
        />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { URL_DAYJS_FORMAT, localState } from '@/logic'
</script>
