<script setup lang="ts">
import { requestPermission } from '@/logic/permission'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import {
  state as keyboardState,
  getSystemBookmarkForKeyboard,
} from '@/newtab/widgets/keyboardBookmark/logic'
import { localConfig, getSettingKeyboardSize } from '@/logic/store'
import { toModifierMask } from '@/logic/globalShortcut/shortcut-utils'
import BookmarkManager from '@/components/BookmarkManager.vue'
import GlobalShortcutRecorder from '@/components/GlobalShortcutRecorder.vue'
import UrlBlacklistInput from '@/components/UrlBlacklistInput.vue'
import { NRadioGroup, NSelect } from 'naive-ui'
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
} from '@/setting/components'
import { SwitchField } from '@/setting/fields'

const bookmarkSourceList = computed(() => [
  { label: window.$t('keyboardBookmark.thisExtension'), value: 2 },
  { label: window.$t('keyboardBookmark.systemBrowser'), value: 1 },
])

const handleBookmarkSourceChange = async (source: number) => {
  if (source === 2) {
    return
  }
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    localConfig.keyboardBookmark.source = 2
    return
  }
  getSystemBookmarkForKeyboard()
}

const defaultFolderOptions = computed(() => {
  return keyboardState.systemBookmarks
    .filter((item) => Object.prototype.hasOwnProperty.call(item, 'children'))
    .map((item) => ({
      label: item.title,
      value: item.title,
    }))
})

const handleDefaultFolderTitleChange = (value: string) => {
  keyboardState.selectedFolderTitleStack = value ? [value] : []
}

// options 页面更宽，使用更大的键盘基准尺寸
const keyboardBaseSize = computed(() => getSettingKeyboardSize())

/**
 * 修饰键冲突警告：当书签快捷键和指令键盘使用相同修饰键时提示
 */
const modifierConflictWarning = computed(() => {
  const bookmarkModifiers = localConfig.keyboardBookmark.globalShortcutModifiers
  const cmdModifiers = localConfig.keyboardCommand.modifiers
  if (
    bookmarkModifiers.length > 0 &&
    cmdModifiers.length > 0 &&
    toModifierMask(bookmarkModifiers) === toModifierMask(cmdModifiers)
  ) {
    return window.$t('keyboardBookmark.modifierConflict')
  }
  return ''
})

/**
 * 无修饰键冲突警告：两者都开时提示
 */
const noModifierConflictWarning = computed(() => {
  if (
    !localConfig.keyboardBookmark.noModifierMode ||
    !localConfig.keyboardCommand.noModifierMode
  ) {
    return ''
  }
  return window.$t('keyboardBookmark.noModifierConflictGeneral')
})

/**
 * 无修饰键模式 + 输入框中触发：建议关闭输入框触发
 */
const noModifierInInputWarning = computed(() => {
  if (
    !localConfig.keyboardBookmark.noModifierMode ||
    !localConfig.keyboardBookmark.shortcutInInputElement
  ) {
    return ''
  }
  return window.$t('keyboardBookmark.noModifierInInputWarning')
})
</script>

<template>
  <SettingHeaderBar :title="$t('setting.keyboardBookmark')" />

  <SettingFormWrap widget-code="keyboardBookmark">
    <!-- 功能配置 -->
    <SettingFormSection
      :title="$t('bookmarkFolder.sectionBookmark')"
      :icon="ICONS.folderOutline"
    >
      <SettingFormItem :label="$t('keyboardBookmark.bookmarkSource')">
        <NRadioGroup
          v-model:value="localConfig.keyboardBookmark.source"
          size="small"
          direction="horizontal"
          @update:value="handleBookmarkSourceChange"
        >
          <NRadio
            v-for="item in bookmarkSourceList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadio>
        </NRadioGroup>
      </SettingFormItem>

      <SettingFormItem
        v-if="localConfig.keyboardBookmark.source === 1"
        :label="$t('keyboardBookmark.defaultDisplayFolderTitle')"
      >
        <NSelect
          v-model:value="localConfig.keyboardBookmark.defaultExpandFolder"
          :options="defaultFolderOptions"
          :placeholder="$t('keyboardBookmark.rootDirectory')"
          clearable
          @update:value="handleDefaultFolderTitleChange"
        />
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.keyboardBookmark.isNewTabOpen"
        :label="$t('generalSetting.newTabOpen')"
      />
    </SettingFormSection>

    <SettingFormSection
      :title="$t('bookmarkFolder.sectionShortcut')"
      :icon="ICONS.keyboardCmdKey"
    >
      <SwitchField
        v-model="localConfig.keyboardBookmark.isGlobalShortcutEnabled"
        :label="$t('keyboardBookmark.listenBackgroundKeystrokes')"
        :tip-content="$t('keyboardBookmark.shortcutNote')"
      />

      <template v-if="localConfig.keyboardBookmark.isGlobalShortcutEnabled">
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
          v-model="localConfig.keyboardBookmark.shortcutInInputElement"
          :label="$t('keyboardBookmark.shortcutInInputElement')"
          :tip-content="$t('keyboardBookmark.shortcutInInputElementTips')"
        />

        <SettingFormItem
          :label="$t('keyboardBookmark.urlBlacklist')"
          :tip-content="$t('generalSetting.urlBlacklistTips')"
          align-items="flex-start"
        >
          <UrlBlacklistInput
            v-model="localConfig.keyboardBookmark.urlBlacklist"
          />
        </SettingFormItem>

        <SwitchField
          v-model="localConfig.keyboardBookmark.noModifierMode"
          :label="$t('keyboardBookmark.noModifierMode')"
          :tip-content="$t('keyboardBookmark.noModifierModeDesc')"
        />

        <SettingFormItem :label="$t('keyboardBookmark.globalModifier')">
          <GlobalShortcutRecorder
            v-model="localConfig.keyboardBookmark.globalShortcutModifiers"
            :disabled="localConfig.keyboardBookmark.noModifierMode"
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
      </template>
    </SettingFormSection>

    <BookmarkManager :base-size="keyboardBaseSize" />
  </SettingFormWrap>
</template>

<style>
.flip-list-move {
  transition: transform 0.8s ease;
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
