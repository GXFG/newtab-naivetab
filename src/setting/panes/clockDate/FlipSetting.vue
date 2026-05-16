<script setup lang="ts">
import { localConfig } from '@/logic/config/state'
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
  <SettingFormWrap widget-code="clockFlip">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SettingFormInlineRow>
        <SwitchField
          v-model="localConfig.clockFlip.showSeconds"
          :label="$t('clock.showSeconds')"
        />

        <SwitchField
          v-model="localConfig.clockFlip.is24Hour"
          :label="$t('clock.hour24')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <SwitchField
          v-model="localConfig.clockFlip.showColon"
          :label="$t('clock.showColon')"
        />

        <SwitchField
          v-model="localConfig.clockFlip.colonBlinkEnabled"
          :label="$t('clock.colonBlink')"
          :disabled="!localConfig.clockFlip.showColon"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 尺寸样式 -->
    <SettingFormSection section-key="common.size">
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.clockFlip.width"
          :label="$t('common.width')"
          :min="1"
          :max="1000"
          :step="1"
        />

        <NumberField
          v-model="localConfig.clockFlip.height"
          :label="$t('common.height')"
          :min="1"
          :max="1000"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.clockFlip.borderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="100"
          :step="1"
        />

        <NumberField
          v-model="localConfig.clockFlip.cardGap"
          :label="$t('clock.cardGap')"
          :min="0"
          :max="100"
          :step="0.1"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 文字排版 -->
    <SettingFormSection section-key="common.typography">
      <FontField
        v-model:font-family="localConfig.clockFlip.fontFamily"
        v-model:font-color="localConfig.clockFlip.fontColor"
        v-model:font-size="localConfig.clockFlip.fontSize"
        :label="$t('common.font')"
      />
    </SettingFormSection>

    <!-- 色彩外观 -->
    <SettingFormSection section-key="common.appearance">
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.clockFlip.cardColor"
          :label="$t('clock.cardColor')"
        />

        <ColorField
          v-model="localConfig.clockFlip.cardDividerColor"
          :label="$t('clock.cardDividerColor')"
        />
      </SettingFormInlineRow>

      <ToggleColorField
        v-model:enable="localConfig.clockFlip.isShadowEnabled"
        v-model:color="localConfig.clockFlip.shadowColor"
        :label="$t('common.shadow')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
