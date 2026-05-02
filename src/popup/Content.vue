<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { loadRemoteKeyboardConfig } from '@/logic/sync/core'
import PopupConfigBookmark from '@/popup/PopupConfigBookmark.vue'

window.$message = useMessage()

onMounted(async () => {
  // 轻量级拉取云端 keyboard 配置，确保 popup 显示最新数据
  // 只读不写，不产生写入配额消耗，即使快速关闭也无副作用
  await loadRemoteKeyboardConfig()
})
</script>

<template>
  <PopupConfigBookmark />
</template>
