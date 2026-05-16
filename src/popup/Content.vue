<script setup lang="ts">
import { BookmarkSource } from '@/common/widget-constants'
import { localConfig } from '@/logic/config/state'
import { loadRemoteKeyboardConfig } from '@/logic/config/sync/loader'
import {
  loadActiveLayer,
  getSystemBookmarkForKeyboard,
} from '@/logic/keyboard/bookmark-state'
import PopupConfigSystemBookmark from '@/popup/PopupConfigSystemBookmark.vue'
import PopupConfigNaiveBookmark from '@/popup/PopupConfigNaiveBookmark.vue'

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
</script>

<template>
  <PopupConfigNaiveBookmark v-if="!isSystemBookmark" />
  <PopupConfigSystemBookmark v-else />
</template>
