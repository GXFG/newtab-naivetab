<script setup lang="ts">
import { SECOND_MODAL_WIDTH } from '@/logic/constants/app'
import {
  KEYCAP_PREINSTALL_GROUPS,
  KEYCAP_PREINSTALL_MAP,
  type KeycapThemeKey,
} from '@/logic/keyboard/themes'
import { localConfig, localState } from '@/logic/config/state'
import { useDrawerStack } from '@/composables/useDrawerStack'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:show'])

const onCloseModal = () => {
  emit('update:show', false)
}

// ESC 逐层关闭支持
useDrawerStack('preset-theme-drawer', toRef(props, 'show'), onCloseModal)

const onSelectPresetTheme = (themeKey: KeycapThemeKey) => {
  localConfig.keyboardCommon.shellColor[localState.value.currAppearanceCode] =
    KEYCAP_PREINSTALL_MAP[themeKey].shellColor
  localConfig.keyboardCommon.mainFontColor[
    localState.value.currAppearanceCode
  ] = KEYCAP_PREINSTALL_MAP[themeKey].mainFontColor
  localConfig.keyboardCommon.mainBackgroundColor[
    localState.value.currAppearanceCode
  ] = KEYCAP_PREINSTALL_MAP[themeKey].mainBackgroundColor
  localConfig.keyboardCommon.emphasisOneFontColor[
    localState.value.currAppearanceCode
  ] = KEYCAP_PREINSTALL_MAP[themeKey].emphasisOneFontColor
  localConfig.keyboardCommon.emphasisOneBackgroundColor[
    localState.value.currAppearanceCode
  ] = KEYCAP_PREINSTALL_MAP[themeKey].emphasisOneBackgroundColor
  localConfig.keyboardCommon.emphasisTwoFontColor[
    localState.value.currAppearanceCode
  ] = KEYCAP_PREINSTALL_MAP[themeKey].emphasisTwoFontColor
  localConfig.keyboardCommon.emphasisTwoBackgroundColor[
    localState.value.currAppearanceCode
  ] = KEYCAP_PREINSTALL_MAP[themeKey].emphasisTwoBackgroundColor
}

const presetThemeGroups = KEYCAP_PREINSTALL_GROUPS

// 每行共 8 个单位格，span 表示占几格
// t: 'main'=主色  'e1'=强调色一  'e2'=强调色二
const KB_ROWS = [
  // 数字行：esc(1) + 1~6(6) + del(1) = 8
  [
    { k: 'esc', t: 'e2' as const, span: 1 },
    { k: '1', t: 'main' as const, span: 1 },
    { k: '2', t: 'main' as const, span: 1 },
    { k: '3', t: 'main' as const, span: 1 },
    { k: '4', t: 'main' as const, span: 1 },
    { k: '5', t: 'main' as const, span: 1 },
    { k: 'del', t: 'e1' as const, span: 2 },
  ],
  // QWERTY 行：tab(1) + Q~Y(6) + \(1) = 8
  [
    { k: 'tab', t: 'e1' as const, span: 1 },
    { k: 'Q', t: 'main' as const, span: 1 },
    { k: 'W', t: 'main' as const, span: 1 },
    { k: 'E', t: 'main' as const, span: 1 },
    { k: 'R', t: 'main' as const, span: 1 },
    { k: 'T', t: 'main' as const, span: 1 },
    { k: 'Y', t: 'main' as const, span: 1 },
    { k: '\\', t: 'main' as const, span: 1 },
  ],
  // ASDF 行：caps(2) + A~F(4) + ↵(2) = 8
  [
    { k: 'caps', t: 'e1' as const, span: 2 },
    { k: 'A', t: 'main' as const, span: 1 },
    { k: 'S', t: 'main' as const, span: 1 },
    { k: 'D', t: 'main' as const, span: 1 },
    { k: 'F', t: 'main' as const, span: 1 },
    { k: 'enter', t: 'e2' as const, span: 2 },
  ],
  // 底行：ctrl(2) + space(4) + ↑(2) = 8
  [
    { k: 'ctrl', t: 'e1' as const, span: 2 },
    { k: '', t: 'main' as const, span: 4 },
    { k: 'alt', t: 'e1' as const, span: 2 },
  ],
]

const getKeycapStyle = (themeKey: string, type: 'main' | 'e1' | 'e2') => {
  const theme = KEYCAP_PREINSTALL_MAP[themeKey]
  if (type === 'e1')
    return `color:${theme.emphasisOneFontColor};background-color:${theme.emphasisOneBackgroundColor}`
  if (type === 'e2')
    return `color:${theme.emphasisTwoFontColor};background-color:${theme.emphasisTwoBackgroundColor}`
  return `color:${theme.mainFontColor};background-color:${theme.mainBackgroundColor}`
}
</script>

<template>
  <NDrawer
    :show="props.show"
    :width="SECOND_MODAL_WIDTH"
    :height="350"
    :placement="localConfig.general.drawerPlacement"
    show-mask="transparent"
    to="#preset-theme__drawer"
    @update:show="onCloseModal()"
  >
    <NDrawerContent
      :title="$t('keyboardCommon.selectPresetThemeLabel')"
      closable
    >
      <div class="theme__sections">
        <section
          v-for="group in presetThemeGroups"
          :key="group.key"
          class="theme__section"
        >
          <div class="section__header">
            <span class="section__label">{{ $t(group.labelKey) }}</span>
            <span class="section__count">{{
              Object.keys(group.themes).length
            }}</span>
          </div>

          <div class="theme__container">
            <div
              v-for="[themeKey, theme] in Object.entries(group.themes)"
              :key="themeKey"
              class="theme__item"
              :style="`background-color: ${theme.shellColor}`"
              @click="onSelectPresetTheme(themeKey as KeycapThemeKey)"
            >
              <span
                class="theme__title"
                :style="getKeycapStyle(themeKey, 'main')"
                >{{ theme.label }}</span
              >

              <div
                v-for="(row, ri) in KB_ROWS"
                :key="ri"
                class="keyboard__row"
              >
                <span
                  v-for="(key, ki) in row"
                  :key="ki"
                  class="keycap"
                  :style="`${getKeycapStyle(themeKey, key.t)};grid-column:span ${key.span}`"
                  >{{ key.k }}</span
                >
              </div>
            </div>
          </div>
        </section>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.theme__sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 2px;
}

.theme__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section__label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--n-text-color-base);
}

.section__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--n-text-color-2);
  background-color: var(--n-color-target);
}

.theme__container {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.theme__item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.18s ease;

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.18),
      0 2px 6px rgba(0, 0, 0, 0.1);
    opacity: 0.92;
  }

  &:active {
    transform: translateY(0) scale(0.98);
    box-shadow:
      0 1px 4px rgba(0, 0, 0, 0.14),
      0 1px 3px rgba(0, 0, 0, 0.08);
    opacity: 0.8;
  }
}

/* 每行：8 等分 grid，行间距 2px */
.keyboard__row {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

/* 通用键帽 */
.keycap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 15px;
  border-radius: 2px;
  font-size: 7px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.01em;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.theme__title {
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  opacity: 0.92;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
</style>
