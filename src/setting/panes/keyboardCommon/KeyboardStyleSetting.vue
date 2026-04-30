<script setup lang="ts">
import {
  KEYBOARD_TYPE_OPTION,
  SPLIT_SPACE_OPTION,
  KEYCAP_TYPE_OPTION,
} from '@/logic/keyboard/keyboard-constants'
import { localConfig } from '@/logic/store'
import { SettingFormItem, SettingFormSection } from '@/setting/components'
import { SwitchField } from '@/setting/fields'
import { ICONS } from '@/logic/icons'
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
      >
        <NRadio
          v-for="item in KEYBOARD_TYPE_OPTION"
          :key="item.value"
          :value="item.value"
          class="keyboard-style-radio__item"
        >
          {{ item.label }}
        </NRadio>
      </NRadioGroup>
    </SettingFormItem>
  </SettingFormSection>
</template>

<style scoped>
.keyboard-style-radio__item {
  width: 20%;
}
</style>
