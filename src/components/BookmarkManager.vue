<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, computed, nextTick } from 'vue'
import { flushConfigSync } from '@/logic/sync/core'
import {
  KEYBOARD_URL_MAX_LENGTH,
  KEYBOARD_NAME_MAX_LENGTH,
} from '@/logic/keyboard/keyboard-constants'
import { currKeyboardConfig } from '@/logic/keyboard/keyboard-layout'
import {
  localConfig,
  customPrimaryColor,
  colorMixWithAlpha,
} from '@/logic/store'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import { requestPermission } from '@/logic/permission'
import {
  getBookmarkConfigName,
  getBookmarkConfigUrl,
  getDefaultBookmarkNameFromUrl,
} from '@/newtab/widgets/keyboardBookmark/logic'
import { getFaviconFromUrl } from '@/logic/bookmark'
import BrowserBookmarkPicker from '@/components/BrowserBookmarkPicker.vue'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'

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

// ── Props ─────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    /** 键盘基准尺寸（px） */
    baseSize?: number
    /** 是否立即同步到 chrome.storage.sync（popup 为 true，newtab 已有 debounce watch 为 false） */
    immediateSync?: boolean
  }>(),
  {
    baseSize: 30,
    immediateSync: false,
  },
)

// ── 键帽样式 ──────────────────────────────────────────────────────────────
const keyboardStyle = useKeyboardStyle('px', props.baseSize)
const {
  getCustomLabel,
  getKeycapStageStyle,
  getKeycapTextStyle,
  getKeycapIconStyle,
  getEmphasisStyle,
  keycapCssVars,
} = keyboardStyle

// ── 键帽可见性配置 ────────────────────────────────────────────────────────
const keycapVisualType = computed(() => localConfig.keyboardCommon.keycapType)
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

// ── 当前标签页 URL ────────────────────────────────────────────────────────
const pendingUrl = ref('')

onMounted(() => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const url = tabs[0]?.url
    if (url && /^https?:\/\//.test(url)) {
      pendingUrl.value = url.slice(0, KEYBOARD_URL_MAX_LENGTH)
    }
  })
})

// ── 状态 ──────────────────────────────────────────────────────────────────
const bookmarkState = reactive({
  keyCode: '',
  isBookmarkModalVisible: false,
  isBookmarkDragEnabled: true,
  currDragKeyCode: '',
  targetDragKeyCode: '',
})

// ── 延迟创建 keymap entry ───────────────────────────────────────────────
// 仅在用户真正修改 URL 或名称时才创建 entry，避免点击键帽即产生空 entry 污染数据
const ensureKeymapEntry = (code: string) => {
  if (!localConfig.keyboardBookmark.keymap[code]) {
    localConfig.keyboardBookmark.keymap[code] = { url: '', name: '' }
  }
}

// ── 选中键帽 ──────────────────────────────────────────────────────────────
const selectKey = (code: string) => {
  bookmarkState.keyCode = code
}

// ── 当前键帽的 keymap entry ──────────────────────────────────────────────
// 有选中的键帽时总是渲染表单，entry 可能为空（用户尚未配置）
const currKeymapEntry = computed(() => {
  const code = bookmarkState.keyCode
  if (!code) return null
  return localConfig.keyboardBookmark.keymap[code] ?? null
})

// 表单是否可见：有选中的键帽就渲染表单（即使尚未配置）
const isFormVisible = computed(() => bookmarkState.keyCode !== '')

// ── 表单字段 getter/setter ──────────────────────────────────────────────
const getCurrKeymapUrl = () => currKeymapEntry.value?.url ?? ''
const setCurrKeymapUrl = (v: string) => {
  if (bookmarkState.keyCode) {
    ensureKeymapEntry(bookmarkState.keyCode)
    const entry = localConfig.keyboardBookmark.keymap[bookmarkState.keyCode]
    entry.url = v.replaceAll(' ', '')
  }
}
const getCurrKeymapName = () => currKeymapEntry.value?.name ?? ''
const setCurrKeymapName = (v: string) => {
  if (bookmarkState.keyCode) {
    ensureKeymapEntry(bookmarkState.keyCode)
    const entry = localConfig.keyboardBookmark.keymap[bookmarkState.keyCode]
    entry.name = (v ?? '').trim()
  }
}

// ── 键帽渲染辅助 ─────────────────────────────────────────────────────────
const getKeycapName = (code: string) => getBookmarkConfigName(code)

const getKeycapIconSrc = (code: string) => {
  const url = getBookmarkConfigUrl(code)
  return url ? getFaviconFromUrl(url) : ''
}

const getKeycapBookmarkType = (code: string) => {
  const url = getBookmarkConfigUrl(code)
  return url.length > 0 ? 'mark' : 'none'
}

// ── 书签选择器 ───────────────────────────────────────────────────────────
const onOpenBookmarkPicker = async () => {
  const granted = await requestPermission('bookmarks')
  if (!granted) return
  bookmarkState.isBookmarkModalVisible = true
}

const onSelectBookmark = (payload: { title: string; url?: string }) => {
  if (!bookmarkState.keyCode) return
  ensureKeymapEntry(bookmarkState.keyCode)
  const entry = localConfig.keyboardBookmark.keymap[bookmarkState.keyCode]
  entry.url = (payload.url || '').slice(0, KEYBOARD_URL_MAX_LENGTH)
  entry.name = (payload.title || '').slice(0, KEYBOARD_NAME_MAX_LENGTH)
  bookmarkState.isBookmarkModalVisible = false
}

// ── 删除书签 ─────────────────────────────────────────────────────────────
const onDeleteBookmark = () => {
  if (bookmarkState.keyCode.length === 0) return
  delete localConfig.keyboardBookmark.keymap[bookmarkState.keyCode]
  // bookmarkState.keyCode = ''  // 删除后保持选中状态，用户可以继续为该键帽选择新的书签
}

// ── 拖拽交换 ─────────────────────────────────────────────────────────────
const handleDragStart = (code: string) => {
  bookmarkState.currDragKeyCode = code
}

const handleDragOver = (e: Event, targetCode: string) => {
  e.preventDefault()
  bookmarkState.targetDragKeyCode = targetCode
}

const handleDragEnd = () => {
  if (bookmarkState.currDragKeyCode === bookmarkState.targetDragKeyCode) {
    bookmarkState.currDragKeyCode = ''
    bookmarkState.targetDragKeyCode = ''
    return
  }
  if (!localConfig.keyboardBookmark.keymap[bookmarkState.currDragKeyCode]) {
    bookmarkState.currDragKeyCode = ''
    bookmarkState.targetDragKeyCode = ''
    return
  }

  const targetData =
    localConfig.keyboardBookmark.keymap[bookmarkState.targetDragKeyCode]
  localConfig.keyboardBookmark.keymap[bookmarkState.targetDragKeyCode] =
    localConfig.keyboardBookmark.keymap[bookmarkState.currDragKeyCode]

  if (targetData) {
    localConfig.keyboardBookmark.keymap[bookmarkState.currDragKeyCode] =
      targetData
  } else {
    delete localConfig.keyboardBookmark.keymap[bookmarkState.currDragKeyCode]
  }

  bookmarkState.keyCode = bookmarkState.targetDragKeyCode
  bookmarkState.currDragKeyCode = ''
  bookmarkState.targetDragKeyCode = ''
}

// ── 操作 loading ────────────────────────────────────────────────────────
const isCommitLoading = ref(false)

const handleCommit = async () => {
  if (!bookmarkState.keyCode) return
  isCommitLoading.value = true
  try {
    await flushConfigSync('keyboardBookmark')
  } catch (e) {
    console.error('[BookmarkManager] flushConfigSync failed:', e)
  } finally {
    isCommitLoading.value = false
  }
}

// 暴露给父组件：是否有待同步的数据（网络请求中）
const hasPendingSync = computed(() => isCommitLoading.value)
defineExpose({ hasPendingSync })

// popup 场景中用户可能改完直接关闭，等不到 blur 事件
// 用一个 300ms 的 debounce 在输入过程中自动同步，给用户关闭 popup 留出时间
let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null

const scheduleDebouncedFlush = () => {
  if (!props.immediateSync) return
  if (pendingFlushTimer) clearTimeout(pendingFlushTimer)
  pendingFlushTimer = setTimeout(() => {
    pendingFlushTimer = null
    handleCommit()
  }, 300)
}

onUnmounted(() => {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer)
    pendingFlushTimer = null
  }
})

// ── 当前标签页 URL 填入 ───────────────────────────────────────────────────
const currKeymapUrl = computed(() => getCurrKeymapUrl())
const isOverwritingUrl = computed(() => currKeymapUrl.value.length > 0)

const wrapSync = async (fn: () => void) => {
  fn()
  await nextTick()
  if (props.immediateSync) {
    await handleCommit()
  }
}

const onHandleApplyCurrentTabUrl = () =>
  wrapSync(() => setCurrKeymapUrl(pendingUrl.value))
const onHandleSelectBookmark = (payload: { title: string; url?: string }) =>
  wrapSync(() => onSelectBookmark(payload))
const onHandleDragEnd = () => wrapSync(() => handleDragEnd())
const onHandleDeleteKey = () => wrapSync(() => onDeleteBookmark())

// URL/name 输入：修改本地状态 短 debounce 同步
const onHandleSetUrl = (v: string) => {
  setCurrKeymapUrl(v)
  scheduleDebouncedFlush()
}

const onHandleSetName = (v: string) => {
  setCurrKeymapName(v)
  scheduleDebouncedFlush()
}

// URL/name 输入失焦时提交（popup 场景：确保关闭前数据已同步，避免 debounce 丢失）
const onHandleInputBlur = () => {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer)
    pendingFlushTimer = null
  }
  if (props.immediateSync) {
    handleCommit()
  }
}
</script>

<template>
  <BrowserBookmarkPicker
    v-model:show="bookmarkState.isBookmarkModalVisible"
    width="60%"
    @select="onHandleSelectBookmark"
  />

  <div
    class="bookmark-manager"
    :style="cssVars"
  >
    <!-- 键盘区域 -->
    <div class="manager__keyboard-wrap">
      <KeyboardLayout
        unit="px"
        :base-size="baseSize"
        :keys="currKeyboardConfig.keys"
      >
        <template #keycap="{ code }">
          <div
            class="manager__keycap-drag-wrap"
            :class="{
              'manager__keycap-drag-wrap--drag-target':
                bookmarkState.targetDragKeyCode === code &&
                bookmarkState.currDragKeyCode !== code,
            }"
            :draggable="bookmarkState.isBookmarkDragEnabled"
            @dragstart="handleDragStart(code)"
            @dragover="handleDragOver($event, code)"
            @dragend="onHandleDragEnd()"
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
              :img-draggable="bookmarkState.isBookmarkDragEnabled"
              :is-selected="code === bookmarkState.keyCode"
              :is-border-enabled="isKeycapBorderEnabled"
              :show-cap-key="isCapKeyVisible"
              :show-name="isNameVisible"
              :show-favicon="isFaviconVisible"
              :show-tactile-bumps="isTactileBumpsVisible"
              :style="[keycapCssVars, getEmphasisStyle(code)]"
              @click="selectKey(code)"
            />
          </div>
        </template>
      </KeyboardLayout>
    </div>

    <!-- 表单区域 -->
    <div class="manager__form">
      <template v-if="isFormVisible">
        <div class="form__config">
          <!-- URL/名称输入（popup 失焦时同步，newtab 不触发同步） -->
          <div class="form__field form__field--url">
            <NInput
              size="small"
              :value="getCurrKeymapUrl()"
              :placeholder="$t('keyboardCommon.urlLabel')"
              :maxlength="KEYBOARD_URL_MAX_LENGTH"
              show-count
              clearable
              @update:value="onHandleSetUrl"
              @blur="onHandleInputBlur"
            />
          </div>

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
            <!-- 填入当前标签页 URL（仅在拿到有效 http/https URL 时显示） -->
            <template v-if="pendingUrl">
              <NPopconfirm
                v-if="isOverwritingUrl"
                @positive-click="onHandleApplyCurrentTabUrl"
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
                class="action-btn"
                @click="onHandleApplyCurrentTabUrl"
              >
                <Icon
                  :icon="ICONS.currentLocation"
                  class="btn__icon"
                />
              </NButton>
            </template>

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

            <NPopconfirm @positive-click="onHandleDeleteKey">
              <template #trigger>
                <NButton
                  quaternary
                  size="small"
                  class="action-btn"
                  :disabled="
                    !bookmarkState.keyCode ||
                    !getBookmarkConfigUrl(bookmarkState.keyCode)
                  "
                >
                  <Icon :icon="ICONS.deleteBin" />
                </NButton>
              </template>
              {{ $t('common.delete') }}
              {{ getCustomLabel(bookmarkState.keyCode) }}？
            </NPopconfirm>
          </div>
        </div>
      </template>

      <div
        v-else
        class="form__placeholder"
      >
        {{ $t('keyboardBookmark.selectKeycapTip') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.bookmark-manager {
  display: flex;
  flex-direction: column;

  /* ── 键盘区域 ── */
  .manager__keyboard-wrap {
    display: flex;
    justify-content: center;
  }

  .manager__keycap-drag-wrap {
    width: 100%;
    height: 100%;
    transition: outline var(--transition-fast);
    outline: 2px solid transparent;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .manager__keycap-drag-wrap--drag-target {
    outline: 3px solid var(--nt-bookmark-primary-border);
    outline-offset: 3px;
    background-color: var(--nt-bookmark-drag-highlight-bg);
    border-radius: 6px;
    transform: scale(1.06);
  }

  /* ── 表单区域 ── */
  .manager__form {
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
      color: var(--n-text-color-3);
      font-size: 13px;
      user-select: none;
    }
  }
}
</style>
