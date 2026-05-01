<script setup lang="ts">
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormSection,
  SettingFormItem,
  SettingCollapseSection,
} from '@/setting/components'
import { ICONS } from '@/logic/icons'
import PresetThemeDrawer from './PresetThemeDrawer.vue'
import KeyboardStyleSetting from './KeyboardStyleSetting.vue'
import KeycapSetting from './KeyboardKeycapSetting.vue'
import KeyboardShellSetting from './KeyboardShellSetting.vue'

const state = reactive({
  isPresetThemeDrawerVisible: false,
})

const expandedNames = ref<string[]>([])

const handleExpanded = (name: string, isExpanded: boolean) => {
  if (isExpanded) {
    if (!expandedNames.value.includes(name)) {
      expandedNames.value.push(name)
    }
  } else {
    expandedNames.value = expandedNames.value.filter((n) => n !== name)
  }
}
</script>

<template>
  <PresetThemeDrawer v-model:show="state.isPresetThemeDrawerVisible" />

  <SettingHeaderBar :title="$t('setting.keyboardCommon')" />

  <SettingFormWrap widget-code="keyboardCommon">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SettingFormItem :label="$t('keyboardCommon.presetTheme')">
        <NButton
          type="primary"
          size="tiny"
          secondary
          class="setting__btn setting__btn--primary"
          @click="state.isPresetThemeDrawerVisible = true"
        >
          {{ $t('common.select') }}
        </NButton>
      </SettingFormItem>
    </SettingFormSection>

    <SettingCollapseSection
      name="keyboardStyle"
      :title="$t('keyboardCommon.keyboardConfigLabel')"
      :icon="ICONS.keyboardCommon"
      :expanded="expandedNames.includes('keyboardStyle')"
      @update:expanded="handleExpanded"
    >
      <KeyboardStyleSetting />
    </SettingCollapseSection>

    <SettingCollapseSection
      name="keycapSetting"
      :title="$t('keyboardCommon.keycapConfigLabel')"
      :icon="ICONS.keyboardKeycapLabel"
      :expanded="expandedNames.includes('keycapSetting')"
      @update:expanded="handleExpanded"
    >
      <KeycapSetting />
    </SettingCollapseSection>

    <SettingCollapseSection
      name="shellSetting"
      :title="$t('keyboardCommon.shellPlateConfigLabel')"
      :icon="ICONS.keyboardShellLabel"
      :expanded="expandedNames.includes('shellSetting')"
      @update:expanded="handleExpanded"
    >
      <KeyboardShellSetting />
    </SettingCollapseSection>
  </SettingFormWrap>
</template>
