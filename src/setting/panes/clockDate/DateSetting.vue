<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/constants/urls'
import { localConfig } from '@/logic/config/state'
import {
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
} from '@/setting/components'
import { FontField, ToggleColorField, NumberField } from '@/setting/fields'
</script>

<template>
  <SettingFormWrap widget-code="date">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SettingFormItem
        :label="$t('common.format')"
        :tip-content="URL_DAYJS_FORMAT"
        :tip-link="URL_DAYJS_FORMAT"
      >
        <NInput
          v-model:value="localConfig.date.format"
          size="small"
        />
      </SettingFormItem>
    </SettingFormSection>

    <!-- 文字排版 -->
    <SettingFormSection section-key="common.typography">
      <FontField
        v-model:font-family="localConfig.date.fontFamily"
        v-model:font-color="localConfig.date.fontColor"
        v-model:font-size="localConfig.date.fontSize"
        :label="$t('common.font')"
      />

      <NumberField
        v-model="localConfig.date.letterSpacing"
        :label="$t('common.letterSpacing')"
        :min="0"
        :max="100"
        :step="0.1"
      />
    </SettingFormSection>

    <!-- 色彩外观 -->
    <SettingFormSection section-key="common.appearance">
      <ToggleColorField
        v-model:enable="localConfig.date.isShadowEnabled"
        v-model:color="localConfig.date.shadowColor"
        :label="$t('common.shadow')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
