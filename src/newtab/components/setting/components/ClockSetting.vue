<template>
  <NDivider style="margin-bottom:0;">
    {{ $t('setting.tabAnalogClock') }}
  </NDivider>

  <ElementLayout field="clockAnalog">
    <NFormItem :label="$t('common.theme')">
      <NSelect v-model:value="globalState.setting.clockAnalog.theme" :options="ANALOG_CLOCK_THEME"></NSelect>
    </NFormItem>
  </ElementLayout>
  <ElementConfig field="clockAnalog" />

  <NDivider style="margin-bottom:0;">
    {{ $t('setting.tabDigitalClock') }}
  </NDivider>

  <ElementLayout field="clockDigital">
    <NFormItem :label="$t('common.format')">
      <NInput v-model:value="globalState.setting.clockDigital.format"></NInput>
      <Tips link :content="URL_DAYJS_FORMAT" />
    </NFormItem>
    <NFormItem :label="$t('clock.apMark')">
      <NSwitch v-model:value="globalState.setting.clockDigital.unitEnabled" />
      <NSlider
        v-if="globalState.setting.clockDigital.unitEnabled"
        v-model:value="globalState.style.clockDigital.unit.fontSize"
        class="setting__row-element"
        :step="1"
        :min="12"
        :max="200"
      />
      <NInputNumber v-if="globalState.setting.clockDigital.unitEnabled" v-model:value="globalState.style.clockDigital.unit.fontSize" class="setting__input-number" :min="12" :step="1" />
    </NFormItem>
  </ElementLayout>

  <ElementConfig field="clockDigital" />
</template>

<script setup lang="ts">
import { NDivider, NFormItem, NSelect, NInput, NInputNumber, NSwitch, NSlider } from 'naive-ui'
import { ANALOG_CLOCK_THEME, URL_DAYJS_FORMAT, globalState } from '@/logic'
</script>
