<script setup lang="ts">
import { BookmarkSource } from '@/common/widget-constants'
import { localConfig, flushConfigToLocalStorage } from '@/logic/config/state'
import { loadRemoteKeyboardConfig } from '@/logic/config/sync/loader'
import {
  loadActiveLayer,
  getSystemBookmarkForKeyboard,
} from '@/logic/keyboard/bookmark-state'
import PopupConfigBookmark from '@/popup/PopupConfigBookmark.vue'

const isSystemBookmark = computed(() => {
  return localConfig.keyboardBookmark.source === BookmarkSource.BROWSER
})

onMounted(async () => {
  // 轻量级拉取云端 keyboard 配置，确保 popup 显示最新数据
  // 只读不写，不产生写入配额消耗，即使快速关闭也无副作用
  await loadRemoteKeyboardConfig()
  // 系统书签模式需要加载书签数据
  if (isSystemBookmark.value) {
    await loadActiveLayer()
    await getSystemBookmarkForKeyboard()
  }
})

onBeforeUnmount(() => {
  // popup 关闭前强制写入 localStorage，防止快速关闭导致 useStorageLocal 的 800ms 防抖被清除
  flushConfigToLocalStorage()
})
</script>

<template>
  <PopupConfigBookmark />
</template>
