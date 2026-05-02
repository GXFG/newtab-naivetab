<script setup lang="ts">
import { useMessage, useNotification, useDialog } from 'naive-ui'
import { globalState } from '@/logic/store'
import { setupPageConfigSync } from '@/logic/sync/core'
import { setupLocalStorageSyncListener } from '@/logic/sync/state'
import SettingPaneContent from '@/setting/SettingPaneContent.vue'
import ChangelogModal from '@/components/ChangelogModal.vue'

window.$message = useMessage()
window.$notification = useNotification()
window.$dialog = useDialog()

onMounted(async () => {
  globalState.settingMode = 'options'
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab) {
    globalState.currSettingTabCode = tab as settingPanes
  }
  const anchor = params.get('anchor')
  if (anchor) {
    globalState.currSettingAnchor = anchor
  }
  // 初始化配置同步：拉取云端、注册变更监听
  await setupPageConfigSync()
  setupLocalStorageSyncListener()
})
</script>

<template>
  <!-- Teleport 目标容器（BackgroundDrawer / PresetThemeDrawer 挂载点） -->
  <div id="background__drawer" />
  <div id="preset-theme__drawer" />

  <ChangelogModal />

  <div class="options-page">
    <SettingPaneContent layout="page" />
  </div>
</template>

<style scoped>
.options-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 20px;
  min-height: 100vh;
}
</style>
