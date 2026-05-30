<script setup lang="ts">
import { Icon } from '@iconify/vue'
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormSection,
  SettingFormItem,
  SettingCollapseSection,
} from '@/setting/components'
import { ICONS } from '@/logic/constants/icons'
import {
  KEYCAP_PREINSTALL_MAP,
  type KeycapThemeKey,
} from '@/logic/keyboard/themes'
import { localConfig, localState } from '@/logic/config/state'
import PresetThemeDrawer from './PresetThemeDrawer.vue'
import KeyboardStyleSetting from './KeyboardStyleSetting.vue'
import KeycapSetting from './KeyboardKeycapSetting.vue'
import KeyboardShellSetting from './KeyboardShellSetting.vue'
import KeyboardNameplateSetting from './KeyboardNameplateSetting.vue'
import { showToast } from '@/common/toast'

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

/**
 * 从所有预设主题中随机选一个并应用
 */
const onRandomTheme = () => {
  const keys = Object.keys(KEYCAP_PREINSTALL_MAP) as KeycapThemeKey[]
  const randomKey = keys[Math.floor(Math.random() * keys.length)]
  const theme = KEYCAP_PREINSTALL_MAP[randomKey]
  const code = localState.value.currAppearanceCode

  localConfig.keyboardCommon.shellColor[code] = theme.shellColor
  localConfig.keyboardCommon.mainFontColor[code] = theme.mainFontColor
  localConfig.keyboardCommon.mainBackgroundColor[code] =
    theme.mainBackgroundColor
  localConfig.keyboardCommon.emphasisOneFontColor[code] =
    theme.emphasisOneFontColor
  localConfig.keyboardCommon.emphasisOneBackgroundColor[code] =
    theme.emphasisOneBackgroundColor
  localConfig.keyboardCommon.emphasisTwoFontColor[code] =
    theme.emphasisTwoFontColor
  localConfig.keyboardCommon.emphasisTwoBackgroundColor[code] =
    theme.emphasisTwoBackgroundColor

  showToast.info(
    window
      .$t('keyboardCommon.randomThemeSuccess')
      .replace('__theme__', theme.label),
    2500,
  )
}
</script>

<template>
  <PresetThemeDrawer v-model:show="state.isPresetThemeDrawerVisible" />

  <SettingHeaderBar :title="$t('setting.keyboardCommon')" />

  <SettingFormWrap widget-code="keyboardCommon">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SettingFormItem :label="$t('keyboardCommon.presetTheme')">
        <div class="theme__actions">
          <NButton
            type="primary"
            size="tiny"
            secondary
            class="setting__btn setting__btn--primary"
            @click="state.isPresetThemeDrawerVisible = true"
          >
            <template #icon>
              <Icon icon="mdi:palette-outline" />
            </template>
            {{ $t('common.select') }}
          </NButton>
          <NButton
            size="tiny"
            secondary
            class="setting__btn"
            @click="onRandomTheme"
          >
            <template #icon>
              <Icon icon="mdi:shuffle" />
            </template>
            {{ $t('keyboardCommon.randomTheme') }}
          </NButton>
        </div>
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

    <SettingCollapseSection
      name="nameplateSetting"
      :title="$t('keyboardNameplate.label')"
      :icon="ICONS.keyboardNameplate"
      :expanded="expandedNames.includes('nameplateSetting')"
      @update:expanded="handleExpanded"
    >
      <KeyboardNameplateSetting />
    </SettingCollapseSection>
  </SettingFormWrap>
</template>

<style scoped>
.theme__actions {
  display: flex;
  gap: 8px;
}
</style>
