<script setup lang="ts">
import NTSelect from '@/components/ui/NTSelect.vue'
import { URL_DAYJS_FORMAT } from '@/logic/constants/urls'
import { localConfig } from '@/logic/config/state'
import {
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
} from '@/setting/components'
import { FontField, ToggleColorField, NumberField } from '@/setting/fields'

const CUSTOM_VALUE = '__custom__'
const PRESET_VALUES = [
  'YYYY-MM-DD dddd',
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'MMMM D, YYYY dddd',
  'MM-DD',
  'MMM D ddd',
]

const formatOptions = computed(() => [
  { label: window.$t('date.formatYMDLong'), value: 'YYYY-MM-DD dddd' },
  { label: window.$t('date.formatYMD'), value: 'YYYY-MM-DD' },
  { label: window.$t('date.formatYMDSlash'), value: 'YYYY/MM/DD' },
  { label: window.$t('date.formatYMDCN'), value: 'MMMM D, YYYY dddd' },
  { label: window.$t('date.formatMD'), value: 'MM-DD' },
  { label: window.$t('date.formatMDShort'), value: 'MMM D ddd' },
  { label: window.$t('date.formatCustom'), value: CUSTOM_VALUE },
])

const isCustomMode = ref(!PRESET_VALUES.includes(localConfig.date.format))

const selectedOption = computed(() => {
  if (isCustomMode.value) return CUSTOM_VALUE
  if (PRESET_VALUES.includes(localConfig.date.format))
    return localConfig.date.format
  return CUSTOM_VALUE
})

const handleFormatChange = (value: string) => {
  if (value === CUSTOM_VALUE) {
    isCustomMode.value = true
  } else {
    isCustomMode.value = false
    localConfig.date.format = value
  }
}
</script>

<template>
  <SettingFormWrap widget-code="date">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SettingFormItem :label="$t('date.format')">
        <NTSelect
          :value="selectedOption"
          class="setting__fill-input"
          size="small"
          :options="formatOptions"
          @update:value="handleFormatChange"
        />
      </SettingFormItem>
      <SettingFormItem
        v-if="isCustomMode"
        :label="$t('common.format')"
        :tip-content="URL_DAYJS_FORMAT"
        :tip-link="URL_DAYJS_FORMAT"
      >
        <NTInput
          v-model:value="localConfig.date.format"
          size="small"
          :placeholder="$t('date.formatCustomTip')"
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
