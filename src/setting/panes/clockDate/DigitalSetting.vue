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

const CUSTOM_VALUE = '__custom__'
const PRESET_VALUES = ['HH:mm:ss', 'HH:mm', 'hh:mm:ss', 'hh:mm']

const formatOptions = computed(() => [
  { label: window.$t('clock.format24'), value: 'HH:mm:ss' },
  { label: window.$t('clock.format24NoSec'), value: 'HH:mm' },
  { label: window.$t('clock.format12'), value: 'hh:mm:ss' },
  { label: window.$t('clock.format12NoSec'), value: 'hh:mm' },
  { label: window.$t('clock.formatCustom'), value: CUSTOM_VALUE },
])

// 初始化：当前 format 若不是预设，说明用户之前用过自定义格式
const isCustomMode = ref(
  !PRESET_VALUES.includes(localConfig.clockDigital.format),
)

const selectedOption = computed(() => {
  if (isCustomMode.value) return CUSTOM_VALUE
  if (PRESET_VALUES.includes(localConfig.clockDigital.format))
    return localConfig.clockDigital.format
  return CUSTOM_VALUE
})

const handleFormatChange = (value: string) => {
  if (value === CUSTOM_VALUE) {
    isCustomMode.value = true
  } else {
    isCustomMode.value = false
    localConfig.clockDigital.format = value
  }
}
</script>

<template>
  <SettingFormWrap widget-code="clockDigital">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SettingFormItem :label="$t('clock.format')">
        <NSelect
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
        <NInput
          v-model:value="localConfig.clockDigital.format"
          size="small"
          :placeholder="$t('clock.formatCustomTip')"
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
