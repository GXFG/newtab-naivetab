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
      <NTRadioGroup
        v-model:value="localConfig.keyboardCommon.keycapType"
        direction="horizontal"
        class="keyboard-style-radio__group--triple"
      >
        <NTRadio
          v-for="item in KEYCAP_TYPE_OPTION"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </NTRadio>
      </NTRadioGroup>
    </SettingFormItem>

    <SettingFormItem :label="$t('keyboardCommon.splitSpace')">
      <NTRadioGroup
        v-model:value="localConfig.keyboardCommon.splitSpace"
        direction="horizontal"
        class="keyboard-style-radio__group--triple"
      >
        <NTRadio
          v-for="item in SPLIT_SPACE_OPTION"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </NTRadio>
      </NTRadioGroup>
    </SettingFormItem>

    <SwitchField
      v-model="localConfig.keyboardCommon.keyboardWklMode"
      :label="$t('keyboardCommon.wklMode')"
    />

    <SettingFormItem :label="$t('keyboardCommon.keyboardType')">
      <NTRadioGroup
        v-model:value="localConfig.keyboardCommon.keyboardType"
        direction="horizontal"
        class="keyboard-style-radio__group"
      >
        <NTRadio
          v-for="item in KEYBOARD_TYPE_OPTION"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </NTRadio>
      </NTRadioGroup>
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
