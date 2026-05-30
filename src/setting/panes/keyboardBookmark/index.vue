<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { requestPermission } from '@/logic/utils/permission'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import {
  getSystemBookmarkForKeyboard,
  cachedActiveLayer,
} from '@/logic/keyboard/bookmark-state'
import { localConfig } from '@/logic/config/state'
import { getSettingKeyboardSize } from '@/logic/store/style'
import { toModifierMask } from '@/logic/shortcut/utils'
import { getGlobalModifierTip } from '@/common/i18n'
import {
  exportKeymapToBrowser,
  EXPORT_FOLDER_PATH,
  createLayerBookmarkFolders,
} from '@/logic/keyboard/bookmark-export'
import { findFolderByPath } from '@/logic/bookmark/parser'
import { KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER } from '@/logic/keyboard/keyboard-constants'
import BaseNaiveBookmarkManager from '@/components/BaseNaiveBookmarkManager.vue'
import BaseSystemBookmarkManager from '@/components/BaseSystemBookmarkManager.vue'
import BaseBookmarkLayerTabSwitcher from '@/components/BaseBookmarkLayerTabSwitcher.vue'
import BrowserBookmarkPicker from '@/components/BrowserBookmarkPicker.vue'
import GlobalShortcutRecorder from '@/components/GlobalShortcutRecorder.vue'
import UrlBlacklistInput from '@/components/UrlBlacklistInput.vue'
import { NRadioGroup, NButton } from 'naive-ui'
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
  SettingFormInlineRow,
} from '@/setting/components'
import { SwitchField } from '@/setting/fields'
import { showToast } from '@/common/toast'
import { BookmarkSource } from '@/common/widget-constants'

const bookmarkSourceList = computed(() => [
  {
    label: window.$t('keyboardBookmark.systemBrowser'),
    value: BookmarkSource.BROWSER,
  },
  {
    label: window.$t('keyboardBookmark.thisExtension'),
    value: BookmarkSource.INTERNAL,
  },
])

/**
 * Setting 面板打开时加载系统书签，确保下拉列表有数据
 */
onMounted(() => {
  if (localConfig.keyboardBookmark.source === BookmarkSource.BROWSER) {
    getSystemBookmarkForKeyboard()
  }
})

const handleBookmarkSourceChange = async (source: number) => {
  if (source === BookmarkSource.INTERNAL) {
    return
  }
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    localConfig.keyboardBookmark.source = BookmarkSource.INTERNAL
    return
  }
  getSystemBookmarkForKeyboard()
}

// options 页面更宽，使用更大的键盘基准尺寸
const keyboardBaseSize = computed(() => getSettingKeyboardSize())

/**
 * source=2 时，keymap 序列化大小接近 5KB 则提示切换浏览器书签
 */
const showBrowserBookmarkSuggestion = computed(() => {
  if (localConfig.keyboardBookmark.source !== BookmarkSource.INTERNAL)
    return false
  const keymap = localConfig.keyboardBookmark.keymap
  const size = new Blob([JSON.stringify(keymap)]).size
  return size > 5000
})

const handleSwitchToBrowserBookmark = async () => {
  const granted = await requestPermission('bookmarks')
  if (!granted) return
  localConfig.keyboardBookmark.source = BookmarkSource.BROWSER
  getSystemBookmarkForKeyboard()
}

/**
 * source=BookmarkSource.BROWSER 时，layers 变化需重新解析书签
 */
watch(
  () => localConfig.keyboardBookmark.layers.map((l) => l.sourceFolderPath),
  () => {
    if (localConfig.keyboardBookmark.source === BookmarkSource.BROWSER) {
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
 * 修饰键相关警告集合（多条独立显示）
 */
const modifierWarnings = computed(() => {
  return [
    modifierConflictWarning.value,
    noModifierConflictWarning.value,
  ].filter(Boolean)
})

/**
 * 文件夹选择器控制：-1 = 关闭，0-3 = 打开对应层
 */
const layerFolderPickerIndex = ref(-1)

const showLayerFolderPicker = (idx: number) => {
  layerFolderPickerIndex.value = idx
}

const onSelectLayerFolder = (option: BookmarkNode) => {
  const idx = layerFolderPickerIndex.value
  if (idx < 0) return
  localConfig.keyboardBookmark.layers[idx].sourceFolderPath =
    (option as any).path || option.title
  layerFolderPickerIndex.value = -1
  if (idx === cachedActiveLayer.value) {
    getSystemBookmarkForKeyboard()
  }
}

const onClearLayerFolder = (idx: number) => {
  localConfig.keyboardBookmark.layers[idx].sourceFolderPath = ''
  if (idx === cachedActiveLayer.value) {
    getSystemBookmarkForKeyboard()
  }
}

/** 取文件夹路径最后一段作为 UI 展示 */
const displayFolderName = (path: string) => path.split('/').pop() || path

/**
 * 是否展示"一键创建层"按钮
 * 条件：所有 layer 均未配置 sourceFolderPath
 */
const showCreateLayerButton = computed(() => {
  if (localConfig.keyboardBookmark.source !== BookmarkSource.BROWSER)
    return false
  return localConfig.keyboardBookmark.layers.every((l) => !l.sourceFolderPath)
})

/**
 * 一键创建 4 个书签层
 */
const handleCreateLayerFolders = async () => {
  try {
    const paths = await createLayerBookmarkFolders()
    // 将创建的路径绑定到对应 Layer
    paths.forEach((path: string, idx: number) => {
      localConfig.keyboardBookmark.layers[idx].sourceFolderPath = path
    })
    showToast.success(window.$t('keyboardBookmark.createLayerFoldersSuccess'))
  } catch {
    showToast.error(window.$t('keyboardBookmark.createLayerFoldersFailed'))
  }
}

/**
 * 导出书签到浏览器
 */
const handleExportToBrowser = async () => {
  const keymap = localConfig.keyboardBookmark.keymap

  const bookmarkCount = Object.values(keymap).filter((e) => e?.url).length
  if (bookmarkCount === 0) {
    showToast.warning(window.$t('keyboardBookmark.exportNoBookmarks'))
    return
  }

  const granted = await requestPermission('bookmarks')
  if (!granted) return

  const tree = await chrome.bookmarks.getTree()
  const existingFolder = findFolderByPath(tree, `${EXPORT_FOLDER_PATH}/layer1`)

  if (existingFolder && existingFolder.children?.length) {
    const exportPath = `${KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER}/layer1`
    const dialogContent =
      window
        .$t('keyboardBookmark.exportFolderExists')
        .replace('__folder__', exportPath) +
      '\n' +
      window
        .$t('keyboardBookmark.exportClearConfirm')
        .replace('__folder__', exportPath)

    window.$dialog.create({
      title: window.$t('keyboardBookmark.exportFolderExistsTitle'),
      content: dialogContent,
      positiveText: window.$t('keyboardBookmark.exportClearAndRebuild'),
      negativeText: window.$t('keyboardBookmark.exportCancel'),
      onPositiveClick: () => doExport(keymap),
    })
  } else {
    await doExport(keymap)
  }
}

const doExport = async (keymap: Record<string, TBookmarkEntry>) => {
  try {
    const count = Object.values(keymap).filter((e) => e?.url).length
    await exportKeymapToBrowser(keymap)
    const successMsg = window
      .$t('keyboardBookmark.exportSuccess')
      .replace('__count__', String(count))
      .replace('__folder__', `${KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER}/layer1`)
    showToast.success(successMsg)
  } catch (e) {
    console.error('[Export] failed:', e)
    showToast.error(window.$t('keyboardBookmark.exportFailed'))
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
      <SettingFormItem
        :label="$t('keyboardBookmark.bookmarkSource')"
        :tip-content="$t('keyboardBookmark.bookmarkSourceTips')"
      >
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

      <SwitchField
        v-model="localConfig.keyboardBookmark.isNewTabOpen"
        :label="$t('generalSetting.newTabOpen')"
      />

      <template
        v-if="localConfig.keyboardBookmark.source === BookmarkSource.INTERNAL"
      >
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
    </SettingFormSection>

    <template
      v-if="localConfig.keyboardBookmark.source === BookmarkSource.BROWSER"
    >
      <!-- 4 个书签层配置 -->
      <SettingFormSection
        :title="$t('keyboardBookmark.layerFolders')"
        :icon="ICONS.folderOutline"
        :tip-content="$t('keyboardBookmark.layerFoldersTip')"
      >
        <SettingFormItem v-if="showCreateLayerButton">
          <NButton
            class="setting__btn setting__btn--primary"
            type="primary"
            size="tiny"
            secondary
            round
            @click="handleCreateLayerFolders"
          >
            <Icon :icon="ICONS.add" />
            {{ $t('keyboardBookmark.createLayerFolders') }}
          </NButton>
        </SettingFormItem>

        <template
          v-for="(layer, idx) in localConfig.keyboardBookmark.layers"
          :key="idx"
        >
          <SettingFormInlineRow v-if="idx % 2 === 0">
            <SettingFormItem
              :label-width="55"
              :label="
                $t('keyboardBookmark.layerN').replace('__n__', String(idx + 1))
              "
            >
              <span
                class="layer-folder-name"
                @click="showLayerFolderPicker(idx)"
              >
                <template v-if="displayFolderName(layer.sourceFolderPath)">
                  {{ displayFolderName(layer.sourceFolderPath) }}
                </template>
                <span
                  v-else
                  class="layer-folder-name--placeholder"
                >
                  {{ $t('keyboardBookmark.notConfigured') }}
                </span>
              </span>
              <NButton
                size="small"
                text
                :disabled="!layer.sourceFolderPath"
                @click="onClearLayerFolder(idx)"
              >
                <Icon :icon="ICONS.closeCircleLine" />
              </NButton>
            </SettingFormItem>
            <SettingFormItem
              v-if="idx + 1 < localConfig.keyboardBookmark.layers.length"
              :label-width="55"
              :label="
                $t('keyboardBookmark.layerN').replace('__n__', String(idx + 2))
              "
            >
              <span
                class="layer-folder-name"
                @click="showLayerFolderPicker(idx + 1)"
              >
                <template
                  v-if="
                    displayFolderName(
                      localConfig.keyboardBookmark.layers[idx + 1]
                        .sourceFolderPath,
                    )
                  "
                >
                  {{
                    displayFolderName(
                      localConfig.keyboardBookmark.layers[idx + 1]
                        .sourceFolderPath,
                    )
                  }}
                </template>
                <span
                  v-else
                  class="layer-folder-name--placeholder"
                >
                  {{ $t('keyboardBookmark.notConfigured') }}
                </span>
              </span>
              <NButton
                size="small"
                text
                :disabled="
                  !localConfig.keyboardBookmark.layers[idx + 1].sourceFolderPath
                "
                @click="onClearLayerFolder(idx + 1)"
              >
                <Icon :icon="ICONS.closeCircleLine" />
              </NButton>
            </SettingFormItem>
          </SettingFormInlineRow>
        </template>
      </SettingFormSection>
    </template>

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
        <SwitchField
          v-model="localConfig.keyboardBookmark.shortcutInInputElement"
          :label="$t('keyboardBookmark.shortcutInInputElement')"
          :tip-content="$t('keyboardBookmark.shortcutInInputElementTips')"
          :warning-message="noModifierInInputWarning"
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

        <SettingFormItem
          :label="$t('keyboardBookmark.globalModifier')"
          :tip-content="getGlobalModifierTip()"
          :warning-message="modifierWarnings"
        >
          <GlobalShortcutRecorder
            v-model="localConfig.keyboardBookmark.globalShortcutModifiers"
            :disabled="localConfig.keyboardBookmark.noModifierMode"
          />
        </SettingFormItem>
      </template>
    </SettingFormSection>

    <template
      v-if="localConfig.keyboardBookmark.source === BookmarkSource.BROWSER"
    >
      <div class="layer-switcher-wrap">
        <BaseBookmarkLayerTabSwitcher />
      </div>
      <BaseSystemBookmarkManager :base-size="keyboardBaseSize" />
    </template>
    <BaseNaiveBookmarkManager
      v-if="localConfig.keyboardBookmark.source === BookmarkSource.INTERNAL"
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
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
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
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  color: var(--n-text-color);
  flex: 1;
  min-width: 0;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.layer-folder-name:hover {
  background-color: var(--gray-alpha-10);
  color: var(--n-text-color-hover, var(--n-text-color));
}

.layer-folder-name:active {
  transform: scale(0.98);
  background-color: var(--gray-alpha-12);
}

.layer-folder-name--placeholder {
  color: var(--gray-alpha-09);
}

.layer-switcher-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
</style>
