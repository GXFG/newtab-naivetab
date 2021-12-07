<template>
  <ComponentLayout field="clockDigital">
    <NFormItem :label="$t('common.format')">
      <NInput v-model:value="globalState.setting.clockDigital.format"></NInput>
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
      <NInputNumber
        v-if="globalState.setting.clockDigital.unitEnabled"
        v-model:value="globalState.style.clockDigital.unit.fontSize"
        class="setting__input-number"
        :min="12"
        :step="1"
      ></NInputNumber>
    </NFormItem>
  </ComponentLayout>

  <ElementConfig field="clockDigital" />
</template>

<script setup lang="ts">
import { NFormItem, NSwitch, NSlider, NInput, NInputNumber } from 'naive-ui'
import { globalState } from '@/logic'

</script>
