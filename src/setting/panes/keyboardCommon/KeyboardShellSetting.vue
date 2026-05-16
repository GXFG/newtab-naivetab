<script setup lang="ts">
import { SettingFormSection, SettingFormInlineRow } from '@/setting/components'
import { localConfig } from '@/logic/config/state'
import { ICONS } from '@/logic/constants/icons'
import { NumberField, ToggleColorField } from '@/setting/fields'
</script>

<template>
  <SettingFormSection
    :title="$t('keyboardCommon.shell')"
    :icon="ICONS.keyboardShellLabel"
  >
    <ToggleColorField
      v-model:enable="localConfig.keyboardCommon.isShellVisible"
      v-model:color="localConfig.keyboardCommon.shellColor"
      :label="$t('keyboardCommon.shell')"
    />

    <ToggleColorField
      v-model:enable="localConfig.keyboardCommon.isShellShadowEnabled"
      v-model:color="localConfig.keyboardCommon.shellShadowColor"
      :label="$t('common.shadow')"
    />

    <template v-if="localConfig.keyboardCommon.isShellVisible">
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.keyboardCommon.shellVerticalPadding"
          :label="$t('keyboardCommon.verticalMarginLabel')"
          :step="1"
          :min="0"
          :max="100"
        />

        <NumberField
          v-model="localConfig.keyboardCommon.shellHorizontalPadding"
          :label="$t('keyboardCommon.horizontalMarginLabel')"
          :step="1"
          :min="0"
          :max="100"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.keyboardCommon.shellBorderRadius"
          :label="$t('common.borderRadius')"
          :step="0.1"
          :min="0"
          :max="30"
        />

        <NumberField
          v-model="localConfig.keyboardCommon.shellBackgroundBlur"
          :label="$t('common.blur')"
          :step="0.1"
          :min="0"
          :max="30"
        />
      </SettingFormInlineRow>
    </template>
  </SettingFormSection>

  <!-- Plate -->
  <SettingFormSection
    :title="$t('keyboardCommon.plate')"
    :icon="ICONS.keyboardPlateLabel"
  >
    <ToggleColorField
      v-model:enable="localConfig.keyboardCommon.isPlateVisible"
      v-model:color="localConfig.keyboardCommon.plateColor"
      :label="$t('keyboardCommon.plate')"
    />

    <template v-if="localConfig.keyboardCommon.isPlateVisible">
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.keyboardCommon.platePadding"
          :label="$t('common.margin')"
          :step="0.1"
          :min="0"
          :max="10"
        />

        <NumberField
          v-model="localConfig.keyboardCommon.plateBorderRadius"
          :label="$t('common.borderRadius')"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </SettingFormInlineRow>
    </template>
  </SettingFormSection>
</template>
