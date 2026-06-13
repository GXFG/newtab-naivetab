<script setup lang="ts">
import NTInputNumber from '@/components/ui/NTInputNumber.vue'
import { localConfig } from '@/logic/config/state'
import { ICONS } from '@/logic/constants/icons'
import {
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
  SettingFormInlineRow,
} from '@/setting/components'
import {
  NumberField,
  ColorField,
  FontField,
  SwitchField,
  ToggleColorField,
} from '@/setting/fields'

const durationHours = computed({
  get: () => Math.floor(localConfig.countdown.defaultDuration / 3600),
  set: (h: number) => {
    const m = Math.floor((localConfig.countdown.defaultDuration % 3600) / 60)
    const s = localConfig.countdown.defaultDuration % 60
    localConfig.countdown.defaultDuration = Math.max(1, h * 3600 + m * 60 + s)
  },
})

const durationMinutes = computed({
  get: () => Math.floor((localConfig.countdown.defaultDuration % 3600) / 60),
  set: (m: number) => {
    const h = Math.floor(localConfig.countdown.defaultDuration / 3600)
    const s = localConfig.countdown.defaultDuration % 60
    localConfig.countdown.defaultDuration = Math.max(1, h * 3600 + m * 60 + s)
  },
})

const durationSeconds = computed({
  get: () => localConfig.countdown.defaultDuration % 60,
  set: (s: number) => {
    const h = Math.floor(localConfig.countdown.defaultDuration / 3600)
    const m = Math.floor((localConfig.countdown.defaultDuration % 3600) / 60)
    localConfig.countdown.defaultDuration = Math.max(1, h * 3600 + m * 60 + s)
  },
})
</script>

<template>
  <SettingFormWrap widget-code="countdown">
    <!-- 计时器显示 -->
    <SettingFormSection
      :title="$t('countdown.timerDisplay')"
      :icon="ICONS.countdown"
    >
      <SwitchField
        v-model="localConfig.countdown.showHours"
        :label="$t('countdown.showHours')"
      />

      <SettingFormItem :label="$t('countdown.defaultDuration')">
        <div class="duration__inputs">
          <NTInputNumber
            v-if="localConfig.countdown.showHours"
            v-model:value="durationHours"
            class="setting__num-input"
            size="small"
            :min="0"
            :max="99"
            :step="1"
          >
            <!-- 时间单位后缀为国际通用符号，无需 i18n -->
            <template #suffix> h </template>
          </NTInputNumber>
          <NTInputNumber
            v-model:value="durationMinutes"
            class="setting__num-input"
            size="small"
            :min="0"
            :max="59"
            :step="1"
          >
            <!-- 时间单位后缀为国际通用符号，无需 i18n -->
            <template #suffix> m </template>
          </NTInputNumber>
          <NTInputNumber
            v-model:value="durationSeconds"
            class="setting__num-input"
            size="small"
            :min="0"
            :max="59"
            :step="1"
          >
            <!-- 时间单位后缀为国际通用符号，无需 i18n -->
            <template #suffix> s </template>
          </NTInputNumber>
        </div>
      </SettingFormItem>

      <SettingFormItem :label="$t('countdown.label')">
        <NTInput
          v-model:value="localConfig.countdown.label"
          size="small"
          clearable
        />
      </SettingFormItem>
    </SettingFormSection>

    <!-- 进度环样式 -->
    <SettingFormSection
      :title="$t('countdown.ringStyle')"
      :icon="ICONS.countdownPause"
    >
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.countdown.size"
          :label="$t('common.size')"
          :min="1"
          :max="1000"
          :step="1"
        />

        <NumberField
          v-model="localConfig.countdown.strokeWidth"
          :label="$t('countdown.strokeWidth')"
          :min="0"
          :max="50"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.countdown.progressColor"
          :label="$t('countdown.progressColor')"
        />

        <ColorField
          v-model="localConfig.countdown.trackColor"
          :label="$t('countdown.trackColor')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ToggleColorField
          v-model:enable="localConfig.countdown.isBorderEnabled"
          v-model:color="localConfig.countdown.borderColor"
          v-model:width="localConfig.countdown.borderWidth"
          :label="$t('common.border')"
        />

        <ToggleColorField
          v-model:enable="localConfig.countdown.isShadowEnabled"
          v-model:color="localConfig.countdown.shadowColor"
          :label="$t('common.shadow')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 文字排版 -->
    <SettingFormSection section-key="common.typography">
      <FontField
        v-model:font-family="localConfig.countdown.clockFontFamily"
        v-model:font-color="localConfig.countdown.clockFontColor"
        v-model:font-size="localConfig.countdown.clockFontSize"
        :label="$t('countdown.clockStyleFontLabel')"
      />

      <FontField
        v-model:font-family="localConfig.countdown.labelFontFamily"
        v-model:font-color="localConfig.countdown.labelFontColor"
        v-model:font-size="localConfig.countdown.labelFontSize"
        :label="$t('countdown.labelFontLabel')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>

<style scoped>
.duration__inputs {
  display: flex;
  gap: 6px;
}
</style>
