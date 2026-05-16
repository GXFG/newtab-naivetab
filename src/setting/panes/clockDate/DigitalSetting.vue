<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/constants/urls'
import { localConfig } from '@/logic/config/state'
import {
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
} from '@/setting/components'
import {
  NumberField,
  SwitchField,
  FontField,
  ToggleColorField,
} from '@/setting/fields'
</script>

<template>
  <SettingFormWrap widget-code="clockDigital">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SettingFormItem
        :label="$t('common.format')"
        :tip-content="URL_DAYJS_FORMAT"
        :tip-link="URL_DAYJS_FORMAT"
      >
        <NInput
          v-model:value="localConfig.clockDigital.format"
          size="small"
        />
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.clockDigital.colonBlinkEnabled"
        :label="$t('clock.colonBlink')"
      />

      <SwitchField
        v-model="localConfig.clockDigital.unitEnabled"
        :label="$t('clock.apMark')"
      />

      <template v-if="localConfig.clockDigital.unitEnabled">
        <NumberField
          v-model="localConfig.clockDigital.unit.fontSize"
          :label="$t('clock.apMarkFontSize')"
          :min="5"
          :max="200"
          :step="1"
          show-slider
        />
      </template>
    </SettingFormSection>

    <!-- 尺寸样式 -->
    <SettingFormSection section-key="common.size">
      <NumberField
        v-model="localConfig.clockDigital.width"
        :label="$t('common.width')"
        :min="10"
        :max="1000"
        :step="1"
        show-slider
      />
    </SettingFormSection>

    <!-- 文字排版 -->
    <SettingFormSection section-key="common.typography">
      <FontField
        v-model:font-family="localConfig.clockDigital.fontFamily"
        v-model:font-color="localConfig.clockDigital.fontColor"
        v-model:font-size="localConfig.clockDigital.fontSize"
        :label="$t('common.font')"
      />
    </SettingFormSection>

    <!-- 色彩外观 -->
    <SettingFormSection section-key="common.appearance">
      <ToggleColorField
        v-model:enable="localConfig.clockDigital.isShadowEnabled"
        v-model:color="localConfig.clockDigital.shadowColor"
        :label="$t('common.shadow')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
