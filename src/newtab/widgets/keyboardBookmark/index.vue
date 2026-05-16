<script setup lang="ts">
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { isDragMode } from '@/logic/moveable'
import { KEYBOARD_NOT_ALLOW_KEYCODE_LIST_FOR_WIDGET } from '@/logic/keyboard/keyboard-constants'
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
import WidgetWrap from '../WidgetWrap.vue'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import KeyboardKeycapWidget from './KeyboardKeycapWidget.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

// keyboard listener
const keyboardTask = (e: KeyboardEvent) => {
  if (isDragMode.value) {
    return
  }
  const { code, shiftKey, ctrlKey, altKey, metaKey } = e
  if (KEYBOARD_NOT_ALLOW_KEYCODE_LIST_FOR_WIDGET.includes(code)) {
    return
  }
  if (shiftKey || ctrlKey || altKey || metaKey) {
    return
  }
  // 过滤非当前配置下的按键
  if (!keyboardCurrentModelAllKeyList.value.includes(code)) {
    return
  }
  // 命令快捷键开启无修饰键模式时，命令优先，键盘书签不响应
  // 与 CS 端 hasModifierConflict 和 newtab globalShortcutTask 命令优先逻辑保持一致
  if (
    localConfig.keyboardCommand.isEnabled &&
    localConfig.keyboardCommand.noModifierMode
  ) {
    return
  }
  const url = getKeycapUrl(code)
  if (url.length === 0) {
    handlePressKeycap(code)
    return
  }
  keyboardState.currSelectKeyCode = code
  openPage(url)
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeKeydownTask(WIDGET_CODE)
      return
    }
    addKeydownTask(WIDGET_CODE, keyboardTask)
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
