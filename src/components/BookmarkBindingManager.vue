<script setup lang="ts">
import { onMounted, onUnmounted, reactive, computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import {
  localConfig,
  customPrimaryColor,
  colorMixWithAlpha,
} from '@/logic/store'
import { currKeyboardConfig } from '@/logic/keyboard/keyboard-layout'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import { useKeycapDrag } from '@/composables/useKeycapDrag'
import { requestPermission } from '@/logic/permission'
import { getFaviconFromUrl } from '@/logic/bookmark'
import {
  addBookmarkToSourceFolder,
  updateBookmarkInSourceFolder,
  removeBookmarkFromSourceFolder,
  swapBookmarksInSourceFolder,
} from '@/logic/keyboard/bookmark-parser'
import { KEYBOARD_NAME_MAX_LENGTH } from '@/logic/keyboard/keyboard-constants'
import {
  getSystemBookmarkForKeyboard,
  getDefaultBookmarkNameFromUrl,
  state as keyboardState,
  getCurrentLayerFolderTitle,
} from '@/newtab/widgets/keyboardBookmark/logic'
import BrowserBookmarkPicker from '@/components/BrowserBookmarkPicker.vue'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import KeyboardKeycapDisplay from '@/components/KeyboardKeycapDisplay.vue'

const props = withDefaults(
  defineProps<{
    baseSize?: number
    /** 是否立即同步到 Chrome 书签（popup 为 true，setting 为 false） */
    immediateSync?: boolean
  }>(),
  {
    baseSize: 30,
    immediateSync: false,
  },
)

// ── 当前标签页 URL ────────────────────────────────────────────────────────
const pendingUrl = ref('')
const isOverwritingUrl = computed(() => !!currBinding.value?.url)

onMounted(() => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const url = tabs[0]?.url
    if (url && /^https?:\/\//.test(url)) {
      pendingUrl.value = url
    }
  })
})

const onApplyCurrentTabUrl = () => {
  if (!bindState.keyCode || !pendingUrl.value) return
  onSelectBookmark({
    title: getDefaultBookmarkNameFromUrl(pendingUrl.value),
    url: pendingUrl.value,
  })
}

const {
  getCustomLabel,
  getKeycapStageStyle,
  getKeycapTextStyle,
  getKeycapIconStyle,
  getEmphasisStyle,
  keycapCssVars,
} = useKeyboardStyle('px', props.baseSize)

const keycapVisualType = computed(() => localConfig.keyboardCommon.keycapType)

const primaryBorder = computed(() =>
  colorMixWithAlpha(customPrimaryColor.value, 0.55),
)
const dragHighlightBg = computed(() =>
  colorMixWithAlpha(customPrimaryColor.value, 0.12),
)

const cssVars = computed(() => ({
  '--nt-bookmark-primary-border': primaryBorder.value,
  '--nt-bookmark-drag-highlight-bg': dragHighlightBg.value,
}))

const isKeycapBorderEnabled = computed(
  () => localConfig.keyboardCommon.isKeycapBorderEnabled,
)
const isCapKeyVisible = computed(
  () => localConfig.keyboardCommon.isCapKeyVisible,
)
const isNameVisible = computed(() => localConfig.keyboardCommon.isNameVisible)
const isFaviconVisible = computed(
  () => localConfig.keyboardCommon.isFaviconVisible,
)
const isTactileBumpsVisible = computed(
  () => localConfig.keyboardCommon.isTactileBumpsVisible,
)

// ── 状态 ──────────────────────────────────────────────────────────────────
const bindState = reactive({
  keyCode: '',
  isBookmarkPickerVisible: false,
  isUnbinding: false,
})

// ── 选中键帽 ──────────────────────────────────────────────────────────────
// 记录选中 keymap 时的原始 URL，用于 syncBookmark 区分"更新"还是"新建"
let originUrl = ''
const selectKey = (code: string) => {
  if (isSyncing) return // 同步进行中不允许切换，避免状态混乱
  bindState.keyCode = code
  originUrl = keyboardState.systemKeymap[code]?.url ?? ''
}

// ── 拖拽交换 ─────────────────────────────────────────────────────────────
const { isDropTarget, handleDragStart, handleDragOver, handleDragEnd } =
  useKeycapDrag({
    canDrag: (code) => !!keyboardState.systemKeymap[code],
    swapData: async (source, target) => {
      const sourceData = keyboardState.systemKeymap[source]
      const targetData = keyboardState.systemKeymap[target]
      const sourceFolderTitle = getCurrentLayerFolderTitle()

      if (targetData) {
        // 双方都已绑定：交换 systemKeymap + Chrome 书签
        keyboardState.systemKeymap[target] = sourceData
        keyboardState.systemKeymap[source] = targetData
        await swapBookmarksInSourceFolder(sourceFolderTitle, source, target)
      } else {
        // 目标未绑定：移动到目标位置
        delete keyboardState.systemKeymap[source]
        keyboardState.systemKeymap[target] = sourceData
        await updateBookmarkInSourceFolder(
          sourceFolderTitle,
          target,
          sourceData.url,
          sourceData.name || getDefaultBookmarkNameFromUrl(sourceData.url),
        )
        await removeBookmarkFromSourceFolder(sourceFolderTitle, source)
      }
    },
    onAfterSwap: async (target) => {
      await getSystemBookmarkForKeyboard()
      bindState.keyCode = target
      originUrl = keyboardState.systemKeymap[target]?.url ?? ''
    },
  })

// ── 当前键帽的绑定状态 ───────────────────────────────────────────────────
const currBinding = computed(() => {
  const code = bindState.keyCode
  if (!code) return null
  return keyboardState.systemKeymap[code] ?? null
})

const isFormVisible = computed(() => bindState.keyCode !== '')

// ── 打开书签选择器 ───────────────────────────────────────────────────────
const onOpenBookmarkPicker = async () => {
  const granted = await requestPermission('bookmarks')
  if (!granted) return
  bindState.isBookmarkPickerVisible = true
}

// ── 选择书签后绑定 ───────────────────────────────────────────────────────
const onSelectBookmark = async (payload: { title: string; url?: string }) => {
  if (!bindState.keyCode || !payload.url) return

  const code = bindState.keyCode
  const name = payload.title || getDefaultBookmarkNameFromUrl(payload.url)
  const sourceFolderTitle = getCurrentLayerFolderTitle()
  const oldEntry = keyboardState.systemKeymap[code]

  try {
    // 1. 更新 keymap（供 Widget 展示和快捷键使用）
    keyboardState.systemKeymap[code] = {
      url: payload.url,
      name,
    }

    // 2. 复制书签到 sourceFolder（保持键盘顺序）
    if (oldEntry?.url) {
      await updateBookmarkInSourceFolder(
        sourceFolderTitle,
        code,
        payload.url,
        name,
      )
    } else {
      await addBookmarkToSourceFolder(
        sourceFolderTitle,
        code,
        payload.url,
        name,
      )
    }

    // 3. 重新解析书签树
    await getSystemBookmarkForKeyboard()
  } catch (e) {
    console.error('[ExactMode] bind failed:', e)
  } finally {
    originUrl = keyboardState.systemKeymap[bindState.keyCode]?.url ?? ''
    bindState.isBookmarkPickerVisible = false
  }
}

// ── 编辑 URL/名称 ───────────────────────────────────────────────────────
const onHandleSetUrl = (value: string) => {
  if (!bindState.keyCode) return
  const entry = keyboardState.systemKeymap[bindState.keyCode]
  if (!entry) {
    keyboardState.systemKeymap[bindState.keyCode] = {
      url: value.replaceAll(' ', ''),
      name: '',
    }
  } else {
    entry.url = value.replaceAll(' ', '')
  }
  scheduleDebouncedSync()
}

const getCurrKeymapUrl = (): string => currBinding.value?.url ?? ''

const onHandleSetName = (value: string) => {
  if (!bindState.keyCode) return
  const entry = keyboardState.systemKeymap[bindState.keyCode]
  if (!entry) {
    keyboardState.systemKeymap[bindState.keyCode] = {
      url: '',
      name: value.slice(0, KEYBOARD_NAME_MAX_LENGTH),
    }
  } else {
    entry.name = value.slice(0, KEYBOARD_NAME_MAX_LENGTH)
  }
  scheduleDebouncedSync()
}

const getCurrKeymapName = (): string => currBinding.value?.name ?? ''

/** 同步 Chrome 书签 */
let isSyncing = false

const syncBookmark = async () => {
  if (!bindState.keyCode || isSyncing) return

  isSyncing = true
  const code = bindState.keyCode
  const sourceFolderTitle = getCurrentLayerFolderTitle()
  const url = keyboardState.systemKeymap[code]?.url ?? ''
  const name =
    keyboardState.systemKeymap[code]?.name ||
    getDefaultBookmarkNameFromUrl(url) ||
    ''
  const hadUrl = !!originUrl

  try {
    if (!url) {
      // URL 为空：从 sourceFolder 删除
      await removeBookmarkFromSourceFolder(sourceFolderTitle, code)
    } else if (hadUrl) {
      // URL 存在（更新）
      await updateBookmarkInSourceFolder(sourceFolderTitle, code, url, name)
    } else {
      // URL 从空变有（新建）
      await addBookmarkToSourceFolder(sourceFolderTitle, code, url, name)
    }

    await getSystemBookmarkForKeyboard()
    originUrl = url
  } catch (e) {
    console.error('[BindingManager] sync bookmark failed:', e)
  } finally {
    isSyncing = false
  }
}

/** 防抖同步：popup 场景中用户改完直接关闭，用 debounce 在输入过程中自动同步 */
let pendingSyncTimer: ReturnType<typeof setTimeout> | null = null

const scheduleDebouncedSync = () => {
  if (!props.immediateSync) return
  if (pendingSyncTimer) clearTimeout(pendingSyncTimer)
  pendingSyncTimer = setTimeout(() => {
    pendingSyncTimer = null
    syncBookmark()
  }, 300)
}

// URL/name 输入失焦时提交
const onHandleInputBlur = () => {
  if (pendingSyncTimer) {
    clearTimeout(pendingSyncTimer)
    pendingSyncTimer = null
  }
  syncBookmark()
}

onUnmounted(() => {
  if (pendingSyncTimer) {
    clearTimeout(pendingSyncTimer)
    pendingSyncTimer = null
  }
})

const onUnbind = async () => {
  if (!bindState.keyCode || !currBinding.value?.url) return

  const code = bindState.keyCode
  const sourceFolderTitle = getCurrentLayerFolderTitle()

  bindState.isUnbinding = true
  try {
    // 1. 从 sourceFolder 删除副本（不影响原始书签）
    await removeBookmarkFromSourceFolder(sourceFolderTitle, code)

    // 2. 删除 keymap 中的绑定
    delete keyboardState.systemKeymap[code]

    // 3. 重新解析书签树
    await getSystemBookmarkForKeyboard()
  } catch (e) {
    console.error('[ExactMode] unbind failed:', e)
  } finally {
    originUrl = ''
    bindState.isUnbinding = false
  }
}

// ── 键帽渲染辅助 ─────────────────────────────────────────────────────────
const getKeycapName = (code: string) => {
  const entry = keyboardState.systemKeymap[code]
  return entry?.name || getDefaultBookmarkNameFromUrl(entry?.url || '') || ''
}

const getKeycapIconSrc = (code: string) => {
  const url = keyboardState.systemKeymap[code]?.url
  return url ? getFaviconFromUrl(url) : ''
}

const getKeycapBookmarkType = (code: string) => {
  const url = keyboardState.systemKeymap[code]?.url
  return url ? 'mark' : 'none'
}

const getKeycapTitle = (code: string) => {
  const entry = keyboardState.systemKeymap[code]
  if (!entry) return ''
  if (!entry.name && !entry.url) return ''
  const name = entry.name || getDefaultBookmarkNameFromUrl(entry.url)
  return entry.url ? `${name} · ${entry.url}` : name
}
</script>

<template>
  <BrowserBookmarkPicker
    v-model:show="bindState.isBookmarkPickerVisible"
    width="60%"
    @select="onSelectBookmark"
  />

  <div class="bookmark-binding-manager">
    <!-- 键盘预览 -->
    <div
      class="binding-keyboard"
      :style="cssVars"
    >
      <KeyboardLayout
        unit="px"
        :base-size="baseSize"
        :keys="currKeyboardConfig.keys"
      >
        <template #keycap="{ code }">
          <div
            class="binding-keycap-drag-wrap"
            :class="{
              'binding-keycap-drag-wrap--drag-target': isDropTarget(code),
            }"
            :draggable="!!keyboardState.systemKeymap[code]"
            @dragstart="handleDragStart(code)"
            @dragover="handleDragOver($event, code)"
            @dragend="handleDragEnd()"
          >
            <KeyboardKeycapDisplay
              :key-code="code"
              :label="getCustomLabel(code)"
              :name="getKeycapName(code)"
              :visual-type="keycapVisualType"
              :bookmark-type="getKeycapBookmarkType(code)"
              :icon-src="getKeycapIconSrc(code)"
              :stage-style="getKeycapStageStyle(code)"
              :text-style="getKeycapTextStyle(code)"
              :icon-style="getKeycapIconStyle(code)"
              :img-draggable="false"
              :is-selected="code === bindState.keyCode"
              :is-border-enabled="isKeycapBorderEnabled"
              :show-cap-key="isCapKeyVisible"
              :show-name="isNameVisible"
              :show-favicon="isFaviconVisible"
              :show-tactile-bumps="isTactileBumpsVisible"
              :style="[keycapCssVars, getEmphasisStyle(code)]"
              :title="getKeycapTitle(code)"
              @click="selectKey(code)"
            />
          </div>
        </template>
      </KeyboardLayout>
    </div>

    <!-- 表单区域 -->
    <div class="binding-form">
      <template v-if="isFormVisible">
        <div class="form__config">
          <!-- URL 输入 -->
          <div class="form__field form__field--url">
            <NInput
              size="small"
              :value="getCurrKeymapUrl()"
              :placeholder="$t('keyboardCommon.urlLabel')"
              clearable
              @update:value="onHandleSetUrl"
              @blur="onHandleInputBlur"
            />
          </div>

          <!-- 名称输入 -->
          <div class="form__field form__field--name">
            <NInput
              size="small"
              :value="getCurrKeymapName()"
              :placeholder="
                getDefaultBookmarkNameFromUrl(getCurrKeymapUrl()) ||
                $t('keyboardCommon.nameLabel')
              "
              :maxlength="KEYBOARD_NAME_MAX_LENGTH"
              show-count
              clearable
              @update:value="onHandleSetName"
              @blur="onHandleInputBlur"
            />
          </div>

          <!-- 操作按钮 -->
          <div class="form__field form__field--actions">
            <!-- 填入当前页 URL -->
            <template v-if="pendingUrl">
              <NPopconfirm
                v-if="isOverwritingUrl"
                @positive-click="onApplyCurrentTabUrl"
              >
                <template #trigger>
                  <NButton
                    quaternary
                    size="small"
                    class="setting__btn"
                  >
                    <Icon
                      :icon="ICONS.currentLocation"
                      class="btn__icon"
                    />
                  </NButton>
                </template>
                {{ $t('generalSetting.overwriteUrlConfirm') }}
              </NPopconfirm>
              <NButton
                v-else
                quaternary
                size="small"
                class="setting__btn"
                @click="onApplyCurrentTabUrl"
              >
                <Icon
                  :icon="ICONS.currentLocation"
                  class="btn__icon"
                />
              </NButton>
            </template>
            <!-- 绑定书签 -->
            <NButton
              quaternary
              size="small"
              class="action-btn"
              @click="onOpenBookmarkPicker()"
            >
              <Icon
                :icon="ICONS.bookmarkPlus"
                class="btn__icon"
              />
            </NButton>
            <!-- 解绑 -->
            <NPopconfirm @positive-click="onUnbind">
              <template #trigger>
                <NButton
                  quaternary
                  size="small"
                  class="action-btn"
                  :loading="bindState.isUnbinding"
                  type="error"
                  :disabled="!currBinding"
                >
                  <Icon
                    :icon="ICONS.deleteBin"
                    class="btn__icon"
                  />
                </NButton>
              </template>
              {{ $t('common.delete') }}
              {{ getCustomLabel(bindState.keyCode) }}？
            </NPopconfirm>
          </div>
        </div>
      </template>

      <div
        v-if="!isFormVisible"
        class="form__placeholder"
      >
        {{ $t('keyboardCommand.bindingTip') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.bookmark-binding-manager {
  display: flex;
  flex-direction: column;
}

.binding-keyboard {
  display: flex;
  justify-content: center;

  .binding-keycap-drag-wrap {
    width: 100%;
    height: 100%;
    transition: outline var(--transition-fast);
    outline: 2px solid transparent;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .binding-keycap-drag-wrap--drag-target {
    outline: 3px solid var(--nt-bookmark-primary-border);
    outline-offset: 3px;
    background-color: var(--nt-bookmark-drag-highlight-bg);
    border-radius: 6px;
    transform: scale(1.06);
  }
}

.binding-form {
  padding: 25px 18px;
  height: 80px;
  box-sizing: border-box;

  .form__config {
    display: flex;
    gap: 12px;
    align-items: center;

    .form__field {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .setting__btn {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: var(--radius-md);

        .btn__icon {
          font-size: 16px;
        }
      }
    }

    .form__field--url {
      flex: 1;
      min-width: 0;
    }

    .form__field--name {
      flex: 0 0 auto;
      width: 140px;
    }

    .form__field--actions {
      flex-direction: row;
      flex: 0 0 auto;
      align-self: flex-end;
      display: flex;
      gap: 2px;
    }
  }

  .form__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    color: var(--n-text-color-3);
    font-size: 13px;
    user-select: none;
  }
}

.action-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: var(--radius-md);
}
</style>
