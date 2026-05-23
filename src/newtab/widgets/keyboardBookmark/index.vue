<script setup lang="ts">
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { isDragMode } from '@/logic/moveable'
import {
  currKeyboardConfig,
  keyboardCurrentModelAllKeyList,
} from '@/logic/keyboard/keyboard-layout'
import { localConfig } from '@/logic/config/state'
import { state as keyboardState } from '@/logic/keyboard/bookmark-state'
import {
  openPage,
  getKeycapUrl,
  handlePressKeycap,
} from '@/newtab/widgets/keyboardBookmark/logic'
import { getIsWidgetRender } from '@/logic/store/style'
import { matchShortcut } from '@/logic/shortcut/matcher'
import WidgetWrap from '../WidgetWrap.vue'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import KeyboardKeycapWidget from './KeyboardKeycapWidget.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

/**
 * 键盘书签 keydown 处理，作为命令快捷键的兜底处理书签。
 * 使用 matchShortcut 统一匹配（自动处理 isInInputElement、urlBlacklist、e.repeat）。
 * 通过 task 显式优先级保证命令(0)先于书签(10)执行。
 *
 * keyboardCurrentModelAllKeyList 前置过滤：限定只有当前键盘布局中"可见"的键才能
 * 触发书签快捷键。这是有意设计——newtab 页面有可视化键盘 UI，快捷键行为应与 UI 展示
 * 的按键一致（如 key61 布局不包含 F13，按 F13 不应触发书签）。
 * CS 页面注入到普通网页无 UI 约束，因此不使用此过滤，改用 ALLOWED_SET 白名单。
 */
const keyboardTask = (e: KeyboardEvent) => {
  if (isDragMode.value) return
  // 限定当前 layout 可见按键（newtab 端特有，与虚拟键盘 UI 保持一致）
  if (!keyboardCurrentModelAllKeyList.value.includes(e.code)) return

  const bookmarkCode = matchShortcut(
    e,
    localConfig.keyboardBookmark.isGlobalShortcutEnabled,
    localConfig.keyboardBookmark.globalShortcutModifiers,
    localConfig.keyboardBookmark.shortcutInInputElement,
    localConfig.keyboardBookmark.urlBlacklist,
    location.hostname,
    localConfig.keyboardBookmark.noModifierMode,
  )
  if (!bookmarkCode) return

  // 检查书签是否真正绑定了 URL
  const activeBookmarkKeymap =
    localConfig.keyboardBookmark.source === 1
      ? keyboardState.systemKeymap
      : (localConfig.keyboardBookmark.keymap ?? {})
  if (!activeBookmarkKeymap[bookmarkCode]?.url) return

  const url = getKeycapUrl(bookmarkCode)
  if (url.length === 0) {
    handlePressKeycap(bookmarkCode)
  } else {
    keyboardState.currSelectKeyCode = bookmarkCode
    openPage(url, false, false, bookmarkCode)
  }
  return true
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeKeydownTask(WIDGET_CODE)
      return
    }
    addKeydownTask(WIDGET_CODE, keyboardTask, 10)
  },
  { immediate: true },
)

const containerClass = computed(() => ({
  'keyboardBookmark__container--drag': isDragMode.value,
  'keyboardBookmark__container--hover': !isDragMode.value,
}))
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <KeyboardLayout
      unit="vmin"
      :keys="currKeyboardConfig.keys"
      :extra-class="containerClass"
      class="keyboardBookmark__container"
    >
      <template #keycap="{ code }">
        <KeyboardKeycapWidget :key-code="code" />
      </template>
    </KeyboardLayout>
  </WidgetWrap>
</template>

<style>
#keyboardBookmark {
  user-select: none;

  .keyboardBookmark__container {
    z-index: 10;
    position: absolute;
    overflow: hidden;
  }

  .keyboardBookmark__container--hover {
    cursor: pointer;
  }

  .keyboardBookmark__container--drag {
    background-color: transparent !important;
    &:hover {
      background-color: var(--nt-bg-moveable-widget-main) !important;
    }
  }
}
</style>
