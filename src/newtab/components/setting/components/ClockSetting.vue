<template>
  <ComponentLayout field="clock">
    <NFormItem :label="$t('common.format')">
      <NInput v-model:value="globalState.setting.clock.format"></NInput>
    </NFormItem>

    <NFormItem :label="$t('clock.apMark')">
      <NSwitch v-model:value="globalState.setting.clock.unitEnabled" />
    </NFormItem>
    <NFormItem :label="$t('common.fontSize')">
      <NSlider
        v-model:value="globalState.style.clock.unit.fontSize"
        :step="1"
        :min="12"
        :max="200"
      />
      <NInputNumber
        v-model:value="globalState.style.clock.unit.fontSize"
        class="input_number"
        :min="12"
        :step="1"
      ></NInputNumber>
    </NFormItem>
  </ComponentLayout>

  <ElementConfig field="clock" />
</template>

<script setup lang="ts">
import { NFormItem, NSwitch, NSlider, NInput, NInputNumber } from 'naive-ui'
import { globalState } from '@/logic'

</script>
