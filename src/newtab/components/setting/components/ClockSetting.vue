<template>
  <ComponentLayout field="clock">
    <NFormItem :label="$t('common.format')">
      <NInput v-model:value="globalState.setting.clock.format"></NInput>
    </NFormItem>

    <NFormItem :label="$t('clock.apMark')">
      <NSwitch v-model:value="globalState.setting.clock.unitEnabled" />
      <NSlider
        v-if="globalState.setting.clock.unitEnabled"
        v-model:value="globalState.style.clock.unit.fontSize"
        class="setting__row-element"
        :step="1"
        :min="12"
        :max="200"
      />
      <NInputNumber
        v-if="globalState.setting.clock.unitEnabled"
        v-model:value="globalState.style.clock.unit.fontSize"
        class="setting__input-number"
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
