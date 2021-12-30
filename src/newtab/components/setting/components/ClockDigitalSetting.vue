<template>
  <ElementLayout field="clockDigital">
    <NFormItem :label="$t('common.format')">
      <NInput v-model:value="globalState.setting.clockDigital.format"></NInput>
      <Tips link :content="'https://dayjs.fenxianglu.cn/category/parse.html#%E5%AD%97%E7%AC%A6%E4%B8%B2'" />
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
      <NInputNumber v-if="globalState.setting.clockDigital.unitEnabled" v-model:value="globalState.style.clockDigital.unit.fontSize" class="setting__input_number" :min="12" :step="1"></NInputNumber>
    </NFormItem>
  </ElementLayout>

  <ElementConfig field="clockDigital" />
</template>

<script setup lang="ts">
import { NFormItem, NSwitch, NSlider, NInput, NInputNumber } from 'naive-ui'
import { globalState } from '@/logic'
</script>
