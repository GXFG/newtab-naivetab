<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'
import { NPopconfirm } from 'naive-ui'
import { localConfig, getSettingKeyboardSize } from '@/logic/store'
import { currKeyboardConfig } from '@/logic/keyboard/keyboard-layout'
import {
  ALLOWED_SET,
  formatModifierKeys,
  toModifierMask,
} from '@/logic/globalShortcut/shortcut-utils'
import {
  COMMAND_CATEGORIES,
  type TCommandName,
} from '@/logic/globalShortcut/shortcut-command'
import { ICONS } from '@/logic/icons'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import KeyboardKeycapDisplay from '@/components/KeyboardKeycapDisplay.vue'
import GlobalShortcutRecorder from '@/components/GlobalShortcutRecorder.vue'
import UrlBlacklistInput from '@/components/UrlBlacklistInput.vue'
import {
  SettingFormWrap,
  SettingHeaderBar,
  SettingFormSection,
  SettingFormItem,
} from '@/setting/components'
import { SwitchField } from '@/setting/fields'

const keyboardBaseSize = computed(() => getSettingKeyboardSize())

/**
 * 键盘样式 composable（与 BookmarkManager 共享同一套样式计算）
 */
const commandKeyboardStyle = useKeyboardStyle('px', keyboardBaseSize.value)
const {
  keycapCssVars,
  getEmphasisStyle,
  getCustomLabel,
  getKeycapStageStyle,
  getKeycapTextStyle,
} = commandKeyboardStyle

/**
 * 键帽视觉配置（跟随 keyboard widget 偏好，保持一致性）
 */
const keycapVisualType = computed(() => localConfig.keyboardCommon.keycapType)
const isCapKeyVisible = computed(
  () => localConfig.keyboardCommon.isCapKeyVisible,
)
const isNameVisible = computed(() => localConfig.keyboardCommon.isNameVisible)

/**
 * 命令分类数据（用于 Setting 面板分组展示）
 */
const commandCategories = computed(() => {
  return COMMAND_CATEGORIES.map((cat) => ({
    categoryKey: cat.categoryKey,
    commands: cat.commands.map((cmd) => ({
      label: window.$t(`command.${cmd.command}`),
      value: cmd.command,
      icon: cmd.iconName,
    })),
  }))
})

/**
 * 格式化修饰键 + 主键为可读形式
 */
const formatBinding = (code: string): string => {
  if (localConfig.keyboardCommand.noModifierMode) {
    return getCustomLabel(code)
  }
  const modifier = formatModifierKeys(localConfig.keyboardCommand.modifiers)
  const key = getCustomLabel(code)
  return `${modifier} + ${key}`
}

/**
 * 已绑定的按键集合（用于高亮显示）
 */
const boundKeySet = computed(() => {
  const keymap = localConfig.keyboardCommand.keymap || {}
  return new Set(Object.keys(keymap).filter((code) => keymap[code]?.command))
})

/**
 * 获取按键已绑定的命令
 */
const getBoundCommand = (code: string): string => {
  return localConfig.keyboardCommand.keymap?.[code]?.command || ''
}

/**
 * 获取按键的绑定标签
 */
const getBoundLabel = (code: string): string => {
  const cmd = getBoundCommand(code)
  return cmd ? window.$t(`command.${cmd}`) || cmd : ''
}

/**
 * 获取按键已绑定命令的图标
 */
const getBoundCommandIcon = (code: string): string => {
  const cmd = getBoundCommand(code)
  if (!cmd) return ''
  const cat = commandCategories.value.find((c) =>
    c.commands.some((c2) => c2.value === cmd),
  )
  if (!cat) return ''
  return cat.commands.find((c2) => c2.value === cmd)?.icon || ''
}

/**
 * 当前选中的按键（用于弹出命令选择）
 */
const selectedKeyCode = ref<string | null>(null)

/**
 * 修饰键冲突警告：当命令快捷键和书签快捷键使用相同修饰键时提示
 */
const modifierConflictWarning = computed(() => {
  const cmdModifiers = localConfig.keyboardCommand.modifiers
  const bookmarkModifiers = localConfig.keyboardBookmark.globalShortcutModifiers
  if (
    cmdModifiers.length > 0 &&
    bookmarkModifiers.length > 0 &&
    toModifierMask(cmdModifiers) === toModifierMask(bookmarkModifiers)
  ) {
    return window.$t('keyboardCommand.modifierConflict')
  }
  return ''
})

/**
 * 无修饰键冲突警告：两者都开无修饰键模式 + 当前选中的键同时被双方绑定
 */
const noModifierConflictWarning = computed(() => {
  if (
    !selectedKeyCode.value ||
    !localConfig.keyboardCommand.noModifierMode ||
    !localConfig.keyboardBookmark.noModifierMode
  ) {
    return ''
  }
  const bookmarkKeymap = localConfig.keyboardBookmark.keymap || {}
  if (bookmarkKeymap[selectedKeyCode.value]?.url) {
    return window
      .$t('keyboardCommand.noModifierConflict')
      .replace('__key__', getCustomLabel(selectedKeyCode.value))
  }
  return ''
})

/**
 * 无修饰键模式 + 输入框中触发：建议关闭输入框触发
 */
const noModifierInInputWarning = computed(() => {
  if (
    !localConfig.keyboardCommand.noModifierMode ||
    !localConfig.keyboardCommand.shortcutInInputElement
  ) {
    return ''
  }
  return window.$t('keyboardCommand.noModifierInInputWarning')
})

/**
 * 选中/取消选中按键
 */
const toggleSelectKey = (code: string) => {
  if (!ALLOWED_SET.has(code)) return
  selectedKeyCode.value = selectedKeyCode.value === code ? null : code
}

/**
 * 删除指定按键的绑定
 */
const handleDeleteBinding = () => {
  if (!selectedKeyCode.value) return
  delete localConfig.keyboardCommand.keymap[selectedKeyCode.value]
  const keyLabel = getCustomLabel(selectedKeyCode.value)
  window.$message?.success(`${keyLabel} → ${window.$t('common.none')}`)
  selectedKeyCode.value = null
}

/**
 * 选择命令
 */
const handleCommandSelect = (cmd: TCommandName) => {
  if (!selectedKeyCode.value) return
  if (!cmd) {
    delete localConfig.keyboardCommand.keymap[selectedKeyCode.value]
  } else {
    localConfig.keyboardCommand.keymap[selectedKeyCode.value] = { command: cmd }
  }
  // 不关闭选择面板，让用户看到绑定结果并可以继续选择
  const keyLabel = getCustomLabel(selectedKeyCode.value)
  const cmdLabel = cmd ? window.$t(`command.${cmd}`) : window.$t('common.none')
  window.$message?.success(`${keyLabel} → ${cmdLabel}`)
}
</script>

<template>
  <SettingHeaderBar :title="$t('setting.keyboardCommand')" />

  <SettingFormWrap widget-code="keyboardCommand">
    <!-- 基础设置 -->
    <SettingFormSection
      :title="$t('keyboardCommand.sectionBasic')"
      :icon="ICONS.keyboardCmdKey"
    >
      <SwitchField
        v-model="localConfig.keyboardCommand.isEnabled"
        :label="$t('keyboardCommand.enabled')"
      />

      <SettingFormItem
        v-if="noModifierInInputWarning"
        class="modifier-conflict-card"
      >
        <span class="modifier-conflict-warning">
          <Icon
            :icon="ICONS.warning"
            class="warning__icon"
          />
          {{ noModifierInInputWarning }}
        </span>
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.keyboardCommand.shortcutInInputElement"
        :label="$t('keyboardCommand.shortcutInInputElement')"
        :tip-content="$t('keyboardCommand.shortcutInInputElementTips')"
      />

      <SettingFormItem
        :label="$t('keyboardCommand.urlBlacklist')"
        :tip-content="$t('generalSetting.urlBlacklistTips')"
      >
        <UrlBlacklistInput v-model="localConfig.keyboardCommand.urlBlacklist" />
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.keyboardCommand.noModifierMode"
        :label="$t('keyboardCommand.noModifierMode')"
        :tip-content="$t('keyboardCommand.noModifierModeDesc')"
      />

      <SettingFormItem :label="$t('keyboardCommand.globalModifier')">
        <GlobalShortcutRecorder
          v-model="localConfig.keyboardCommand.modifiers"
          :disabled="localConfig.keyboardCommand.noModifierMode"
        />
      </SettingFormItem>

      <SettingFormItem
        v-if="modifierConflictWarning"
        class="modifier-conflict-card"
      >
        <span class="modifier-conflict-warning">
          <Icon
            :icon="ICONS.warning"
            class="warning__icon"
          />
          {{ modifierConflictWarning }}
        </span>
      </SettingFormItem>

      <SettingFormItem
        v-if="noModifierConflictWarning"
        class="modifier-conflict-card"
      >
        <span class="modifier-conflict-warning">
          <Icon
            :icon="ICONS.warning"
            class="warning__icon"
          />
          {{ noModifierConflictWarning }}
        </span>
      </SettingFormItem>
    </SettingFormSection>

    <!-- 可视化键盘绑定区域 -->
    <div class="command-binding">
      <div class="command-binding__keyboard-wrap">
        <KeyboardLayout
          unit="px"
          :base-size="keyboardBaseSize"
          :keys="currKeyboardConfig.keys"
        >
          <template #keycap="{ code }">
            <div
              class="command-binding__keycap-wrap"
              @click="toggleSelectKey(code)"
            >
              <KeyboardKeycapDisplay
                :key-code="code"
                :label="getCustomLabel(code)"
                :name="getBoundLabel(code)"
                :command-icon="getBoundCommandIcon(code)"
                :visual-type="keycapVisualType"
                :stage-style="getKeycapStageStyle(code)"
                :text-style="getKeycapTextStyle(code)"
                :show-cap-key="isCapKeyVisible"
                :show-name="isNameVisible"
                :show-favicon="false"
                :show-tactile-bumps="false"
                :is-selected="selectedKeyCode === code"
                :is-border-enabled="boundKeySet.has(code)"
                :style="[keycapCssVars, getEmphasisStyle(code)]"
              />
            </div>
          </template>
        </KeyboardLayout>
      </div>

      <!-- 底部区域：tips 或命令选择面板 -->
      <div class="command-binding__footer">
        <div
          v-if="!selectedKeyCode"
          class="command-binding__tip"
        >
          {{ $t('keyboardCommand.bindingTip') }}
        </div>

        <!-- 命令选择面板 -->
        <div
          v-else
          class="command-binding__selector"
        >
          <div class="selector__header">
            <span class="selector__key">{{
              getCustomLabel(selectedKeyCode)
            }}</span>
            <span class="selector__binding">{{
              formatBinding(selectedKeyCode)
            }}</span>
            <NPopconfirm @positive-click="handleDeleteBinding">
              <template #trigger>
                <NButton
                  quaternary
                  size="tiny"
                  class="selector__close"
                >
                  <Icon
                    :icon="ICONS.deleteBin"
                    class="close__icon"
                  />
                </NButton>
              </template>
              {{
                $t('keyboardCommand.confirmDelete').replace(
                  '__key__',
                  getCustomLabel(selectedKeyCode),
                )
              }}
            </NPopconfirm>
          </div>

          <div class="selector__categories">
            <div
              v-for="cat in commandCategories"
              :key="cat.categoryKey"
              class="category-group"
            >
              <div class="category-group__label">
                {{ $t(cat.categoryKey) }}
              </div>
              <NRadioGroup
                :value="getBoundCommand(selectedKeyCode)"
                class="category-group__options"
                @update:value="handleCommandSelect"
              >
                <NRadio
                  v-for="cmd in cat.commands"
                  :key="cmd.value"
                  :value="cmd.value"
                  size="small"
                >
                  <p class="cmd-label-wrap">
                    <Icon
                      :icon="cmd.icon"
                      class="cmd__icon"
                    />
                    <span>{{ cmd.label }}</span>
                  </p>
                </NRadio>
              </NRadioGroup>
            </div>
          </div>
        </div>
      </div>
    </div>
  </SettingFormWrap>
</template>

<style scoped>
.command-binding {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .command-binding__keyboard-wrap {
    display: flex;
    justify-content: center;
  }

  .command-binding__footer {
    min-height: 40px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}

.command-binding__tip {
  font-size: 12px;
  color: var(--n-text-color-3);
  text-align: center;
  padding: 10px 0;
}

.command-binding__keycap-wrap {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

/* 覆盖浏览器默认的 :focus-visible 焦点环 */
.command-binding__keycap-wrap:focus,
.command-binding__keycap-wrap:focus-visible {
  outline: none;
}

.command-binding__selector {
  padding: 12px;
  border-radius: 8px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
}

.selector__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: var(--gray-alpha-05);
  border: 1px solid var(--gray-alpha-08);
}

.selector__categories {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-group__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--n-text-color-2);
  margin-bottom: 4px;
}

/* 命令选择器中的 radio 使用 auto 宽度，配合 2 列网格布局 */
:deep(.category-group__options .n-radio) {
  width: auto;
}

.category-group__options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;

  .cmd-label-wrap {
    display: flex;
    align-items: center;
    gap: 4px;

    .cmd__icon {
      font-size: 14px;
      flex-shrink: 0;
    }
  }
}

/* 增强选中命令的视觉反馈 */
:deep(.category-group__options .n-radio.n-radio--checked) {
  position: relative;
  background: var(--gray-alpha-08);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--n-primary-color);
  padding-left: 5px;
  font-weight: 600;
  color: var(--n-text-color);
  transition: all var(--transition-fast);
}

:deep(.category-group__options .n-radio.n-radio--checked .n-radio__label) {
  font-weight: 600;
  color: var(--n-text-color);
}

:deep(.category-group__options .n-radio.n-radio--checked .n-radio__dot) {
  border-color: var(--n-primary-color);
  background-color: var(--n-primary-color);
}

.selector__key {
  font-size: 13px;
  font-weight: 700;
  color: var(--n-primary-color);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--gray-alpha-06);
  letter-spacing: 0.5px;
}

.selector__binding {
  font-size: 12px;
  color: var(--n-text-color-3);
  font-family: var(--n-font-family), monospace;
  letter-spacing: 0.3px;
}

.selector__close {
  margin-left: auto;
  padding: 0;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
}

.selector__close:hover {
  background-color: var(--gray-alpha-10);
}

.close__icon {
  font-size: 16px;
  color: var(--n-text-color-3);
  transition: color var(--transition-fast);
}

.selector__close:hover .close__icon {
  color: var(--n-text-color);
}

.modifier-conflict-warning {
  font-size: 12px;
  color: rgba(208, 48, 80, 0.9);
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.warning__icon {
  font-size: 14px;
  flex-shrink: 0;
}

.modifier-conflict-card :deep(.form-item__control) {
  justify-content: flex-start;
}
</style>
