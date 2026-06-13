<script setup lang="ts">
import NTInputNumber from '@/components/ui/NTInputNumber.vue'
import NTSelect from '@/components/ui/NTSelect.vue'
import { ICONS } from '@/logic/constants/icons'
import { localConfig } from '@/logic/config/state'
import {
  SettingFormWrap,
  SettingFormInlineRow,
  SettingFormSection,
} from '@/setting/components'
import {
  NumberField,
  SwitchField,
  ColorField,
  FontField,
  ToggleColorField,
} from '@/setting/fields'

const CUSTOM_VALUE = '__custom__'
const PRESET_VALUES = [
  'YYYY.MM.DD',
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'MM-DD',
  'MM/DD',
  'MMM D',
]

const formatOptions = computed(() => [
  { label: window.$t('yearProgress.formatDot'), value: 'YYYY.MM.DD' },
  { label: window.$t('date.formatYMD'), value: 'YYYY-MM-DD' },
  { label: window.$t('date.formatYMDSlash'), value: 'YYYY/MM/DD' },
  { label: window.$t('date.formatMD'), value: 'MM-DD' },
  { label: window.$t('yearProgress.formatMDSlash'), value: 'MM/DD' },
  { label: window.$t('yearProgress.formatMonthDay'), value: 'MMM D' },
  { label: window.$t('yearProgress.formatCustom'), value: CUSTOM_VALUE },
])

const isCustomMode = ref(
  !PRESET_VALUES.includes(localConfig.yearProgress.format),
)

const selectedOption = computed(() => {
  if (isCustomMode.value) return CUSTOM_VALUE
  if (PRESET_VALUES.includes(localConfig.yearProgress.format))
    return localConfig.yearProgress.format
  return CUSTOM_VALUE
})

const handleFormatChange = (value: string) => {
  if (value === CUSTOM_VALUE) {
    isCustomMode.value = true
  } else {
    isCustomMode.value = false
    localConfig.yearProgress.format = value
  }
}
</script>

<template>
  <SettingFormWrap widget-code="yearProgress">
    <!-- 左侧文字配置 -->
    <SettingFormSection
      :icon="ICONS.yearProgressLeftText"
      :title="$t('yearProgress.leftTextLabel')"
    >
      <SettingFormInlineRow>
        <SwitchField
          v-model="localConfig.yearProgress.isRealtime"
          :label="$t('yearProgress.isRealtime')"
        />

        <SwitchField
          v-model="localConfig.yearProgress.isPercentageEnabled"
          :label="$t('yearProgress.percentageLabel')"
        >
          <template #extra>
            <NTInputNumber
              v-model:value="localConfig.yearProgress.percentageDecimal"
              class="setting__num-input--unit"
              size="small"
              :step="1"
              :min="0"
              :max="6"
            >
              <template #prefix>
                {{ $t('yearProgress.decimalLabel') }}
              </template>
            </NTInputNumber>
          </template>
        </SwitchField>
      </SettingFormInlineRow>

      <SwitchField
        v-model="localConfig.yearProgress.isDateEnabled"
        :label="$t('setting.date')"
      >
        <template #extra>
          <NTSelect
            :value="selectedOption"
            class="setting__fill-input"
            size="small"
            :options="formatOptions"
            @update:value="handleFormatChange"
          />
          <NTInput
            v-if="isCustomMode"
            v-model:value="localConfig.yearProgress.format"
            class="setting__fill-input"
            size="small"
            :placeholder="$t('yearProgress.formatCustomTip')"
          />
        </template>
      </SwitchField>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.yearProgress.textLineHeight"
          :label="$t('common.lineHeight')"
          :step="0.1"
          :min="0"
          :max="5"
        />

        <ColorField
          v-model="localConfig.yearProgress.textActiveColor"
          :label="$t('yearProgress.activeFontColorLabel')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 右侧进度块 -->
    <SettingFormSection
      :icon="ICONS.yearProgressRightBlock"
      :title="$t('yearProgress.rightBlockLabel')"
    >
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.yearProgress.blockSize"
          :label="$t('common.size')"
          :step="0.1"
          :min="2"
          :max="10"
        />
        <NumberField
          v-model="localConfig.yearProgress.blockMargin"
          :label="$t('common.margin')"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </SettingFormInlineRow>

      <NumberField
        v-model="localConfig.yearProgress.blockRadius"
        :label="$t('common.borderRadius')"
        :step="0.1"
        :min="0"
        :max="10"
      />

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.yearProgress.blockDefaultColor"
          :label="$t('yearProgress.defaultBgColorLabel')"
        />
        <ColorField
          v-model="localConfig.yearProgress.blockActiveColor"
          :label="$t('yearProgress.activeBgColorLabel')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 容器外观 -->
    <SettingFormSection section-key="common.appearance">
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.yearProgress.width"
          :label="$t('common.width')"
          :min="1"
          :max="1000"
          :step="1"
        />

        <NumberField
          v-model="localConfig.yearProgress.height"
          :label="$t('common.height')"
          :min="1"
          :max="1000"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.yearProgress.padding"
          :label="$t('common.padding')"
          :min="0"
          :max="100"
          :step="1"
        />

        <NumberField
          v-model="localConfig.yearProgress.borderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="100"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.yearProgress.backgroundColor"
          :label="$t('common.backgroundColor')"
        />

        <NumberField
          v-model="localConfig.yearProgress.backgroundBlur"
          :label="$t('common.blur')"
          :min="0"
          :max="50"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ToggleColorField
          v-model:enable="localConfig.yearProgress.isBorderEnabled"
          v-model:color="localConfig.yearProgress.borderColor"
          v-model:width="localConfig.yearProgress.borderWidth"
          :label="$t('common.border')"
        />

        <ToggleColorField
          v-model:enable="localConfig.yearProgress.isShadowEnabled"
          v-model:color="localConfig.yearProgress.shadowColor"
          :label="$t('common.shadow')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 文字排版 -->
    <SettingFormSection section-key="common.typography">
      <FontField
        v-model:font-family="localConfig.yearProgress.fontFamily"
        v-model:font-color="localConfig.yearProgress.fontColor"
        v-model:font-size="localConfig.yearProgress.fontSize"
        :label="$t('common.font')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
