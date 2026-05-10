<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { loadRemoteKeyboardConfig } from '@/logic/sync/core'
import { localConfig } from '@/logic/store'
import {
  getSystemBookmarkForKeyboard,
  loadActiveLayer,
} from '@/newtab/widgets/keyboardBookmark/logic'
import PopupConfigBookmark from '@/popup/PopupConfigBookmark.vue'
import PopupBindingBookmark from '@/popup/PopupBindingBookmark.vue'

window.$message = useMessage()

const popupMode = computed(() => {
  const { source } = localConfig.keyboardBookmark
  if (source === 2) return 'config'
  if (localConfig.keyboardBookmark.bindingMode) return 'binding'
  return 'placeholder'
})

onMounted(async () => {
  // 轻量级拉取云端 keyboard 配置，确保 popup 显示最新数据
  // 只读不写，不产生写入配额消耗，即使快速关闭也无副作用
  await loadRemoteKeyboardConfig()
  // binding 模式需要加载系统书签
  if (popupMode.value === 'binding') {
    // 先恢复用户上次选择的层，再加载书签数据
    await loadActiveLayer()
    await getSystemBookmarkForKeyboard()
  }
})
</script>

<template>
  <PopupConfigBookmark v-if="popupMode === 'config'" />
  <PopupBindingBookmark v-else-if="popupMode === 'binding'" />
  <div
    v-else
    class="popup__placeholder"
  >
    <span class="placeholder__text">
      {{ $t('popup.bindingNotAvailable') }}
    </span>
  </div>
</template>

<style scoped>
.popup__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--n-text-color-3);
  font-size: 13px;
  user-select: none;
}
</style>
