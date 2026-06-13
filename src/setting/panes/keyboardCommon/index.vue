<script setup lang="ts">
import { Icon } from '@iconify/vue'
import {
  SettingFormWrap,
  SettingFormSection,
  SettingFormItem,
} from '@/setting/components'
import NTAccordion from '@/components/ui/NTAccordion.vue'
import type { AccordionItemDef } from '@/components/ui/NTAccordion.vue'
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

const expandedName = ref('')

const accordionItems: AccordionItemDef[] = [
  {
    value: 'keyboardStyle',
    title: window.$t('keyboardCommon.keyboardConfigLabel'),
    icon: ICONS.keyboardCommon,
    content: KeyboardStyleSetting,
  },
  {
    value: 'keycapSetting',
    title: window.$t('keyboardCommon.keycapConfigLabel'),
    icon: ICONS.keyboardKeycapLabel,
    content: KeycapSetting,
  },
  {
    value: 'shellSetting',
    title: window.$t('keyboardCommon.shellPlateConfigLabel'),
    icon: ICONS.keyboardShellLabel,
    content: KeyboardShellSetting,
  },
  {
    value: 'nameplateSetting',
    title: window.$t('keyboardNameplate.label'),
    icon: ICONS.keyboardNameplate,
    content: KeyboardNameplateSetting,
  },
]

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
  <SettingFormWrap widget-code="keyboardCommon">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <SettingFormItem :label="$t('keyboardCommon.presetTheme')">
        <div class="theme__actions">
          <NTButton
            size="tiny"
            variant="secondary"
            round
            @click="onRandomTheme"
          >
            <Icon icon="mdi:shuffle" />
            {{ $t('keyboardCommon.randomTheme') }}
          </NTButton>

          <NTButton
            type="primary"
            size="tiny"
            variant="secondary"
            round
            @click="state.isPresetThemeDrawerVisible = true"
          >
            <Icon icon="mdi:palette-outline" />
            {{ $t('common.select') }}
          </NTButton>
        </div>
      </SettingFormItem>
    </SettingFormSection>

    <NTAccordion
      v-model="expandedName"
      :items="accordionItems"
    />
  </SettingFormWrap>
</template>

<style scoped>
.theme__actions {
  display: flex;
  gap: 8px;
}
</style>
