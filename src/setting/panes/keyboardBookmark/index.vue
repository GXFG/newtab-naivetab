<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { requestPermission } from '@/logic/permission'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import {
  state as keyboardState,
  getSystemBookmarkForKeyboard,
  getCurrentLayerFolderTitle,
  cachedActiveLayer,
} from '@/newtab/widgets/keyboardBookmark/logic'
import { localConfig, getSettingKeyboardSize } from '@/logic/store'
import { toModifierMask } from '@/logic/globalShortcut/shortcut-utils'
import {
  exportKeymapToBrowser,
  findFolderByName,
} from '@/logic/keyboard/bookmark-parser'
import BookmarkManager from '@/components/BookmarkManager.vue'
import BookmarkBindingManager from '@/components/BookmarkBindingManager.vue'
import BrowserBookmarkPicker from '@/components/BrowserBookmarkPicker.vue'
import GlobalShortcutRecorder from '@/components/GlobalShortcutRecorder.vue'
import UrlBlacklistInput from '@/components/UrlBlacklistInput.vue'
import { NRadioGroup, NSelect, NButton, NInput } from 'naive-ui'
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
  SettingFormInlineRow,
} from '@/setting/components'
import { SwitchField } from '@/setting/fields'

const bookmarkSourceList = computed(() => [
  { label: window.$t('keyboardBookmark.systemBrowser'), value: 1 },
  { label: window.$t('keyboardBookmark.thisExtension'), value: 2 },
])

/**
 * Setting 面板打开时加载系统书签，确保下拉列表有数据
 */
onMounted(() => {
  if (localConfig.keyboardBookmark.source === 1) {
    getSystemBookmarkForKeyboard()
  }
})

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

const bookmarkFolderOptions = computed(() => {
  return keyboardState.systemBookmarks
    .filter((item) => Object.prototype.hasOwnProperty.call(item, 'children'))
    .map((item) => ({
      label: item.title,
      value: item.title,
    }))
})

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
 * source=2 时，keymap 序列化大小接近 5KB 则提示切换浏览器书签
 */
const showBrowserBookmarkSuggestion = computed(() => {
  if (localConfig.keyboardBookmark.source !== 2) return false
  const keymap = localConfig.keyboardBookmark.keymap
  const size = new Blob([JSON.stringify(keymap)]).size
  return size > 5000
})

const handleSwitchToBrowserBookmark = async () => {
  const granted = await requestPermission('bookmarks')
  if (!granted) return
  localConfig.keyboardBookmark.source = 1
  getSystemBookmarkForKeyboard()
}

/**
 * source=1 时，bindingMode 或 layers 变化需重新解析书签
 */
watch(
  [
    () => localConfig.keyboardBookmark.bindingMode,
    () => localConfig.keyboardBookmark.layers.map((l) => l.sourceFolderTitle),
  ],
  () => {
    if (localConfig.keyboardBookmark.source === 1) {
      getSystemBookmarkForKeyboard()
    }
  },
  { deep: true },
)

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

/**
 * 文件夹选择器控制：-1 = 关闭，0-4 = 打开对应层
 */
const layerFolderPickerIndex = ref(-1)

const showLayerFolderPicker = (idx: number) => {
  layerFolderPickerIndex.value = idx
}

const onSelectLayerFolder = (option: BookmarkNode) => {
  const idx = layerFolderPickerIndex.value
  if (idx < 0) return
  localConfig.keyboardBookmark.layers[idx].sourceFolderTitle = option.title
  layerFolderPickerIndex.value = -1
  if (idx === cachedActiveLayer.value) {
    getSystemBookmarkForKeyboard()
  }
}

const onClearLayerFolder = (idx: number) => {
  localConfig.keyboardBookmark.layers[idx].sourceFolderTitle = ''
  if (idx === cachedActiveLayer.value) {
    getSystemBookmarkForKeyboard()
  }
}

/**
 * 导出书签到浏览器
 */
const handleExportToBrowser = async () => {
  const keymap = localConfig.keyboardBookmark.keymap
  const folderTitle =
    localConfig.keyboardBookmark.layers[0]?.sourceFolderTitle || 'NaiveTab'

  const bookmarkCount = Object.values(keymap).filter((e) => e?.url).length
  if (bookmarkCount === 0) {
    window.$message.warning(window.$t('keyboardBookmark.exportNoBookmarks'))
    return
  }

  const granted = await requestPermission('bookmarks')
  if (!granted) return

  const tree = await chrome.bookmarks.getTree()
  const existingFolder = findFolderByName(tree, folderTitle)

  if (existingFolder) {
    const dialogContent =
      window
        .$t('keyboardBookmark.exportFolderExists')
        .replace('__folder__', folderTitle) +
      '\n' +
      window
        .$t('keyboardBookmark.exportClearConfirm')
        .replace('__folder__', folderTitle)

    window.$dialog.create({
      title: window.$t('keyboardBookmark.exportFolderExistsTitle'),
      content: dialogContent,
      positiveText: window.$t('keyboardBookmark.exportClearAndRebuild'),
      negativeText: window.$t('keyboardBookmark.exportCancel'),
      onPositiveClick: () => doExport(folderTitle, keymap, 'clearAndRebuild'),
    })
  } else {
    await doExport(folderTitle, keymap, 'create')
  }
}

const doExport = async (
  folderTitle: string,
  keymap: Record<string, TBookmarkEntry>,
  mode: 'create' | 'clearAndRebuild',
) => {
  try {
    const count = Object.values(keymap).filter((e) => e?.url).length
    await exportKeymapToBrowser(folderTitle, keymap, mode)
    const successMsg = window
      .$t('keyboardBookmark.exportSuccess')
      .replace('__count__', String(count))
      .replace('__folder__', folderTitle)
    window.$message.success(successMsg)
  } catch (e) {
    console.error('[Export] failed:', e)
    window.$message.error(window.$t('keyboardBookmark.exportFailed'))
  }
}
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
        v-if="showBrowserBookmarkSuggestion"
        class="setting-hint-card"
      >
        <span class="setting-hint info">
          <Icon
            :icon="ICONS.info"
            class="hint__icon"
          />
          {{ $t('keyboardBookmark.browserBookmarkSuggestion') }}
        </span>
        <NButton
          size="tiny"
          secondary
          round
          @click="handleSwitchToBrowserBookmark"
        >
          {{ $t('keyboardBookmark.switchToBrowser') }}
        </NButton>
      </SettingFormItem>

      <template v-if="localConfig.keyboardBookmark.source === 1">
        <SwitchField
          v-model="localConfig.keyboardBookmark.bindingMode"
          :label="$t('keyboardBookmark.bindingMode')"
          :tip-content="$t('keyboardBookmark.bindingModeDesc')"
        />
        <!-- bindingMode = false: 保留原有默认展开文件夹 NSelect -->
        <SettingFormItem
          v-if="!localConfig.keyboardBookmark.bindingMode"
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
      </template>

      <template v-if="localConfig.keyboardBookmark.source === 2">
        <SettingFormItem
          :label="$t('keyboardBookmark.exportToBrowserBookmark')"
          :tip-content="$t('keyboardBookmark.exportToBrowserBookmarkDesc')"
        >
          <NButton
            class="setting__btn setting__btn--primary"
            type="primary"
            size="tiny"
            secondary
            round
            @click="handleExportToBrowser"
          >
            <Icon :icon="ICONS.exportFile" />
            {{ $t('common.export') }}
          </NButton>
        </SettingFormItem>
      </template>

      <SwitchField
        v-model="localConfig.keyboardBookmark.isNewTabOpen"
        :label="$t('generalSetting.newTabOpen')"
      />
    </SettingFormSection>

    <!-- bindingMode = true: 4 层文件夹配置 -->
    <SettingFormSection
      v-if="
        localConfig.keyboardBookmark.source === 1 &&
        localConfig.keyboardBookmark.bindingMode
      "
      :title="$t('keyboardBookmark.layerFolders')"
      :icon="ICONS.folderOutline"
    >
      <SettingFormInlineRow>
        <SettingFormItem
          v-for="(_, idx) in localConfig.keyboardBookmark.layers.slice(0, 2)"
          :key="idx"
          :label="
            $t('keyboardBookmark.layerN').replace('__n__', String(idx + 1))
          "
        >
          <span
            class="layer-folder-name"
            @click="showLayerFolderPicker(idx)"
          >
            {{
              localConfig.keyboardBookmark.layers[idx].sourceFolderTitle ||
              $t('keyboardBookmark.notConfigured')
            }}
          </span>
          <NButton
            size="small"
            text
            :disabled="
              !localConfig.keyboardBookmark.layers[idx].sourceFolderTitle
            "
            @click="onClearLayerFolder(idx)"
          >
            <Icon :icon="ICONS.closeCircleLine" />
          </NButton>
        </SettingFormItem>
      </SettingFormInlineRow>
      <SettingFormInlineRow>
        <SettingFormItem
          v-for="(_, idx) in localConfig.keyboardBookmark.layers.slice(2, 4)"
          :key="idx + 2"
          :label="
            $t('keyboardBookmark.layerN').replace('__n__', String(idx + 3))
          "
        >
          <span
            class="layer-folder-name"
            @click="showLayerFolderPicker(idx + 2)"
          >
            {{
              localConfig.keyboardBookmark.layers[idx + 2].sourceFolderTitle ||
              $t('keyboardBookmark.notConfigured')
            }}
          </span>
          <NButton
            size="small"
            text
            :disabled="
              !localConfig.keyboardBookmark.layers[idx + 2].sourceFolderTitle
            "
            @click="onClearLayerFolder(idx + 2)"
          >
            <Icon :icon="ICONS.closeCircleLine" />
          </NButton>
        </SettingFormItem>
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 快捷键设置 -->
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
          class="setting-hint-card"
        >
          <span class="setting-hint danger">
            <Icon
              :icon="ICONS.warning"
              class="hint__icon"
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
          class="setting-hint-card"
        >
          <span class="setting-hint danger">
            <Icon
              :icon="ICONS.warning"
              class="hint__icon"
            />
            {{ modifierConflictWarning }}
          </span>
        </SettingFormItem>

        <SettingFormItem
          v-if="noModifierConflictWarning"
          class="setting-hint-card"
        >
          <span class="setting-hint danger">
            <Icon
              :icon="ICONS.warning"
              class="hint__icon"
            />
            {{ noModifierConflictWarning }}
          </span>
        </SettingFormItem>
      </template>
    </SettingFormSection>

    <template
      v-if="
        localConfig.keyboardBookmark.source === 1 &&
        localConfig.keyboardBookmark.bindingMode
      "
    >
      <BookmarkBindingManager :base-size="keyboardBaseSize" />
    </template>
    <BookmarkManager
      v-if="localConfig.keyboardBookmark.source === 2"
      :base-size="keyboardBaseSize"
    />

    <!-- 文件夹选择器弹窗 -->
    <BrowserBookmarkPicker
      :show="layerFolderPickerIndex >= 0"
      selectType="folder"
      @select="onSelectLayerFolder"
      @update:show="
        (v) => {
          if (!v) layerFolderPickerIndex = -1
        }
      "
    />
  </SettingFormWrap>
</template>

<style>
.flip-list-move {
  transition: transform 0.8s ease;
}

.setting-hint {
  font-size: 12px;
  color: rgba(208, 48, 80, 0.9);
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.setting-hint.danger {
  color: rgba(208, 48, 80, 0.9);
}

.setting-hint.danger .hint__icon {
  color: rgba(208, 48, 80, 0.9);
}

.setting-hint.info {
  color: rgba(108, 108, 120, 0.9);
}

.setting-hint.info .hint__icon {
  color: rgba(108, 108, 120, 0.9);
}

.hint__icon {
  font-size: 14px;
  flex-shrink: 0;
}

.setting-hint-card :deep(.form-item__control) {
  justify-content: flex-start;
}

.layer-folder-name {
  font-size: 14px;
  color: var(--n-text-color);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.layer-folder-name:hover {
  background-color: var(--gray-alpha-8);
}
</style>
