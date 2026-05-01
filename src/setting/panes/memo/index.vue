<script setup lang="ts">
import { localConfig } from '@/logic/store'
import { ICONS } from '@/logic/icons'
import {
  SettingHeaderBar,
  SettingFormWrap,
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
</script>

<template>
  <SettingHeaderBar :title="$t('setting.memo')" />

  <SettingFormWrap widget-code="memo">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SwitchField
        v-model="localConfig.memo.countEnabled"
        :label="$t('memo.wordCount')"
      />
    </SettingFormSection>

    <!-- 外观 -->
    <SettingFormSection section-key="common.appearance">
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.memo.width"
          :label="$t('common.width')"
          :min="1"
          :max="1000"
          :step="1"
        />

        <NumberField
          v-model="localConfig.memo.height"
          :label="$t('common.height')"
          :min="1"
          :max="1000"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.memo.borderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="100"
          :step="1"
        />

        <NumberField
          v-model="localConfig.memo.backgroundBlur"
          :label="$t('common.blur')"
          :min="0"
          :max="50"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ToggleColorField
          v-model:enable="localConfig.memo.isBorderEnabled"
          v-model:color="localConfig.memo.borderColor"
          v-model:width="localConfig.memo.borderWidth"
          :label="$t('common.border')"
        />
        <ToggleColorField
          v-model:enable="localConfig.memo.isShadowEnabled"
          v-model:color="localConfig.memo.shadowColor"
          :label="$t('common.shadow')"
        />
      </SettingFormInlineRow>

      <ColorField
        v-model="localConfig.memo.backgroundColor"
        :label="$t('common.backgroundColor')"
      />
    </SettingFormSection>

    <!-- 文字排版 -->
    <SettingFormSection section-key="common.typography">
      <FontField
        v-model:font-family="localConfig.memo.fontFamily"
        v-model:font-color="localConfig.memo.fontColor"
        v-model:font-size="localConfig.memo.fontSize"
        :label="$t('common.font')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
