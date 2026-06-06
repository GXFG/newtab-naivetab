<script setup lang="ts">
import { globalState, initAvailableFontList } from '@/logic/store/state'
import { setupPageConfigSync } from '@/logic/config/sync/loader'
import { setupLocalStorageSyncListener } from '@/logic/config/sync/state'
import SettingPaneContent from '@/setting/SettingPaneContent.vue'
import ChangelogModal from '@/components/ChangelogModal.vue'

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
  // 初始化字体列表（options 页面无 Drawer，需主动加载）
  initAvailableFontList()
})
</script>

<template>
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
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
