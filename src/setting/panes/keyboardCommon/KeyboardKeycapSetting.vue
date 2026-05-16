<script setup lang="ts">
import { localConfig } from '@/logic/config/state'
import {
  availableFontOptions,
  fontSelectRenderLabel,
} from '@/logic/store/style'
import KeyboardEmphasisKeySetting from './KeyboardEmphasisKeySetting.vue'
import { SettingFormInlineRow, SettingFormSection } from '@/setting/components'
import { ICONS } from '@/logic/constants/icons'
import {
  NumberField,
  SwitchField,
  ToggleColorField,
  ColorField,
} from '@/setting/fields'
</script>

<template>
  <!-- 尺寸与形状 -->
  <SettingFormSection
    :title="$t('keyboardCommon.sectionSizeShape')"
    :icon="ICONS.resize"
  >
    <SettingFormInlineRow>
      <NumberField
        v-model="localConfig.keyboardCommon.keycapPadding"
        :label="$t('common.margin')"
        :step="0.1"
        :min="0"
        :max="10"
      />

      <NumberField
        v-model="localConfig.keyboardCommon.keycapSize"
        :label="$t('common.size')"
        :step="1"
        :min="40"
        :max="150"
      />
    </SettingFormInlineRow>

    <NumberField
      v-model="localConfig.keyboardCommon.keycapBorderRadius"
      :label="$t('common.borderRadius')"
      :step="0.1"
      :min="0"
      :max="100"
    />

    <ToggleColorField
      v-model:enable="localConfig.keyboardCommon.isKeycapBorderEnabled"
      v-model:color="localConfig.keyboardCommon.keycapBorderColor"
      v-model:width="localConfig.keyboardCommon.keycapBorderWidth"
      :label="$t('common.border')"
    />
  </SettingFormSection>

  <!-- 键帽内容 -->
  <SettingFormSection
    :title="$t('keyboardCommon.keycapContent')"
    :icon="ICONS.keyboardKeycapLabel"
  >
    <SettingFormInlineRow>
      <SwitchField
        v-model="localConfig.keyboardCommon.isFaviconVisible"
        :label="$t('keyboardCommon.showIcon')"
      />

      <NumberField
        v-model="localConfig.keyboardCommon.faviconSize"
        :label="$t('keyboardCommon.iconSize')"
        :step="0.01"
        :min="0"
        :max="1"
      />
    </SettingFormInlineRow>

    <SwitchField
      v-model="localConfig.keyboardCommon.isCapKeyVisible"
      :label="$t('keyboardCommon.keycapKeyFont')"
    >
      <template #extra>
        <NSelect
          v-model:value="localConfig.keyboardCommon.keycapKeyFontFamily"
          class="setting__fill-input"
          size="small"
          :options="availableFontOptions"
          :render-label="fontSelectRenderLabel"
        />
        <NInputNumber
          v-model:value="localConfig.keyboardCommon.keycapKeyFontSize"
          class="setting__num-input"
          size="small"
          :step="1"
          :min="5"
          :max="50"
        />
      </template>
    </SwitchField>

    <SwitchField
      v-model="localConfig.keyboardCommon.isNameVisible"
      :label="$t('keyboardCommon.nameFont')"
    >
      <template #extra>
        <NSelect
          v-model:value="localConfig.keyboardCommon.keycapBookmarkFontFamily"
          class="setting__fill-input"
          size="small"
          :options="availableFontOptions"
          :render-label="fontSelectRenderLabel"
        />
        <NInputNumber
          v-model:value="localConfig.keyboardCommon.keycapBookmarkFontSize"
          class="setting__num-input"
          size="small"
          :step="1"
          :min="5"
          :max="50"
        />
      </template>
    </SwitchField>

    <SwitchField
      v-model="localConfig.keyboardCommon.isTactileBumpsVisible"
      :label="$t('keyboardCommon.tactileBumps')"
    />
  </SettingFormSection>

  <!-- 颜色 -->
  <SettingFormSection
    :title="$t('keyboardCommon.keycapColor')"
    :icon="ICONS.palette"
  >
    <SettingFormInlineRow :title="$t('keyboardCommon.emphasisGroupNone')">
      <ColorField
        v-model="localConfig.keyboardCommon.mainFontColor"
        :label="$t('common.fontColor')"
      />
      <ColorField
        v-model="localConfig.keyboardCommon.mainBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
    </SettingFormInlineRow>

    <SettingFormInlineRow :title="$t('keyboardCommon.emphasisGroupOne')">
      <ColorField
        v-model="localConfig.keyboardCommon.emphasisOneFontColor"
        :label="$t('common.fontColor')"
      />
      <ColorField
        v-model="localConfig.keyboardCommon.emphasisOneBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
    </SettingFormInlineRow>

    <SettingFormInlineRow :title="$t('keyboardCommon.emphasisGroupTwo')">
      <ColorField
        v-model="localConfig.keyboardCommon.emphasisTwoFontColor"
        :label="$t('common.fontColor')"
      />
      <ColorField
        v-model="localConfig.keyboardCommon.emphasisTwoBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
    </SettingFormInlineRow>
  </SettingFormSection>

  <!-- 强调键分组 -->
  <SettingFormSection
    :title="$t('keyboardCommon.emphasisKeyGroup')"
    :icon="ICONS.keyboardKeycapLabel"
  >
    <KeyboardEmphasisKeySetting />
  </SettingFormSection>
</template>
