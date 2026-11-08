<script setup lang="ts">
import { globalState, initAvailableFontList } from '@/logic/store/state'
import { setupPageConfigSync } from '@/logic/config/sync/loader'
import { setupLocalStorageSyncListener } from '@/logic/config/sync/state'
import { handleAppUpdate, getLocalVersion } from '@/logic/config/update'
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
  // 与 newtab/App.vue 的阶段 2/3 保持同一顺序：先快照本地版本号 → 拉取云端 → 跑迁移。
  // options 是独立的页面上下文，同样会写配置并上传，不迁移的话「升级后只打开设置页」
  // 的用户会以「旧结构 + 新版本号」把字段传到云端，波及同账号其他设备。
  const localVersion = getLocalVersion()
  // 初始化配置同步：拉取云端、注册变更监听
  await setupPageConfigSync()
  setupLocalStorageSyncListener()
  handleAppUpdate(localVersion)
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
  margin: 0 auto;
  padding: var(--space-2) var(--space-5);
  max-width: 1200px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  #setting-board--page.setting-board {
    flex: 1;
    min-height: 0;
    border-radius: var(--radius-lg);
  }

  #setting-board--page .setting-board__content {
    padding: 0 var(--space-4) 50px var(--space-4);
  }
}
</style>
