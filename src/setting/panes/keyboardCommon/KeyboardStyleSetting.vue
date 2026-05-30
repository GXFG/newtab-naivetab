<script setup lang="ts">
import {
  KEYBOARD_TYPE_OPTION,
  SPLIT_SPACE_OPTION,
  KEYCAP_TYPE_OPTION,
} from '@/logic/keyboard/keyboard-constants'
import { localConfig } from '@/logic/config/state'
import { SettingFormItem, SettingFormSection } from '@/setting/components'
import { SwitchField } from '@/setting/fields'
import { ICONS } from '@/logic/constants/icons'
</script>

<template>
  <SettingFormSection
    :title="$t('keyboardCommon.keyboardStyle')"
    :icon="ICONS.keyboardLabel"
  >
    <SettingFormItem :label="$t('keyboardCommon.keycapVisualType')">
      <NRadioGroup
        v-model:value="localConfig.keyboardCommon.keycapType"
        size="small"
        direction="horizontal"
        class="keyboard-style-radio__group--triple"
      >
        <NRadio
          v-for="item in KEYCAP_TYPE_OPTION"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </NRadio>
      </NRadioGroup>
    </SettingFormItem>

    <SettingFormItem :label="$t('keyboardCommon.splitSpace')">
      <NRadioGroup
        v-model:value="localConfig.keyboardCommon.splitSpace"
        size="small"
        direction="horizontal"
        class="keyboard-style-radio__group--triple"
      >
        <NRadio
          v-for="item in SPLIT_SPACE_OPTION"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </NRadio>
      </NRadioGroup>
    </SettingFormItem>

    <SwitchField
      v-model="localConfig.keyboardCommon.keyboardWklMode"
      :label="$t('keyboardCommon.wklMode')"
    />

    <SettingFormItem :label="$t('keyboardCommon.keyboardType')">
      <NRadioGroup
        v-model:value="localConfig.keyboardCommon.keyboardType"
        size="small"
        direction="horizontal"
        class="keyboard-style-radio__group"
      >
        <NRadio
          v-for="item in KEYBOARD_TYPE_OPTION"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </NRadio>
      </NRadioGroup>
    </SettingFormItem>
  </SettingFormSection>
</template>

<style scoped>
/* radio group 用 grid 等分列，不受 SettingPaneContent 中 width:auto 影响 */
:deep(.keyboard-style-radio__group) {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}

:deep(.keyboard-style-radio__group--triple) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
</style>
