<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/constants/urls'
import { ICONS } from '@/logic/icons'
import { localConfig } from '@/logic/store'
import {
  SettingHeaderBar,
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
</script>

<template>
  <SettingHeaderBar :title="$t('setting.yearProgress')" />

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
            <NInputNumber
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
            </NInputNumber>
          </template>
        </SwitchField>
      </SettingFormInlineRow>

      <SwitchField
        v-model="localConfig.yearProgress.isDateEnabled"
        :label="$t('setting.date')"
        :tip-content="URL_DAYJS_FORMAT"
        :tip-link="URL_DAYJS_FORMAT"
      >
        <template #extra>
          <!-- 日期格式占位符为通用示例，无需 i18n -->
          <NInput
            v-model:value="localConfig.yearProgress.format"
            class="setting__fill-input"
            size="small"
            placeholder="MM-DD"
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
