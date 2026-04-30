<script setup lang="ts">
import { ICONS } from '@/logic/icons'
import { localConfig } from '@/logic/store'
import {
  SettingFormWrap,
  SettingFormSection,
  SettingFormInlineRow,
} from '@/setting/components'
import {
  NumberField,
  SwitchField,
  FontField,
  ToggleColorField,
  ColorField,
} from '@/setting/fields'
</script>

<template>
  <SettingFormWrap widget-code="clockNeon">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SettingFormInlineRow>
        <SwitchField
          v-model="localConfig.clockNeon.showSeconds"
          :label="$t('clock.showSeconds')"
        />

        <SwitchField
          v-model="localConfig.clockNeon.is24Hour"
          :label="$t('clock.24hour')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.clockNeon.glowIntensity"
          :label="$t('clock.glowIntensity')"
          :min="0"
          :max="50"
          :step="0.1"
        />
        <SwitchField
          v-model="localConfig.clockNeon.showFrame"
          :label="$t('clock.showFrame')"
        />
      </SettingFormInlineRow>

      <SwitchField
        v-model="localConfig.clockNeon.showLabel"
        :label="$t('clock.showLabel')"
      >
        <template #extra>
          <NInput
            v-model:value="localConfig.clockNeon.labelLeft"
            size="small"
            :placeholder="$t('clock.labelLeftPlaceholder')"
          />
          <NInput
            v-model:value="localConfig.clockNeon.labelRight"
            size="small"
            :placeholder="$t('clock.labelRightPlaceholder')"
          />
        </template>
      </SwitchField>
    </SettingFormSection>

    <!-- 尺寸样式 -->
    <SettingFormSection section-key="common.size">
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.clockNeon.paddingVertical"
          :label="$t('common.paddingVertical')"
          :min="0"
          :max="100"
          :step="0.1"
        />

        <NumberField
          v-model="localConfig.clockNeon.paddingHorizontal"
          :label="$t('common.paddingHorizontal')"
          :min="0"
          :max="100"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <NumberField
        v-model="localConfig.clockNeon.borderRadius"
        :label="$t('common.borderRadius')"
        :min="0"
        :max="100"
        :step="0.1"
      />
    </SettingFormSection>

    <!-- 文字排版 -->
    <SettingFormSection section-key="common.typography">
      <FontField
        v-model:font-family="localConfig.clockNeon.fontFamily"
        v-model:font-color="localConfig.clockNeon.fontColor"
        v-model:font-size="localConfig.clockNeon.fontSize"
        :label="$t('common.font')"
      />
    </SettingFormSection>

    <!-- 色彩外观 -->
    <SettingFormSection section-key="common.appearance">
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.clockNeon.backgroundColor"
          :label="$t('common.backgroundColor')"
        />

        <ToggleColorField
          v-model:enable="localConfig.clockNeon.isBorderEnabled"
          v-model:color="localConfig.clockNeon.borderColor"
          v-model:width="localConfig.clockNeon.borderWidth"
          :label="$t('common.border')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 霓虹时间色 -->
    <SettingFormSection
      :icon="ICONS.neonTimeColors"
      :title="$t('clock.neonTimeColorsLabel')"
    >
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.clockNeon.fontColor"
          :label="$t('clock.neonColor')"
        />
        <ColorField
          v-model="localConfig.clockNeon.secondaryColor"
          :label="$t('clock.neonSecondaryColor')"
        />
        <ColorField
          v-model="localConfig.clockNeon.accentColor"
          :label="$t('clock.neonAccentColor')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 霓虹外框色 -->
    <SettingFormSection
      :icon="ICONS.neonFrameColors"
      :title="$t('clock.neonFrameColorsLabel')"
    >
      <ColorField
        v-model="localConfig.clockNeon.frameColor"
        :label="$t('clock.frameColor')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
