<script setup lang="ts">
import { localConfig } from '@/logic/config/state'
import { globalState, openDrawer } from '@/logic/store/state'
import NTDrawer from '@/components/ui/NTDrawer.vue'
import SettingPaneContent from './SettingPaneContent.vue'

let settingCloseDrawer: (() => void) | undefined

/**
 * 使用 flex 布局替代 JS 测量约束高度。
 * NTDrawer 有固定 height=500，通过 flex 链从上往下传递高度约束。
 */

watch(
  () => globalState.isSettingDrawerVisible,
  (visible) => {
    if (!visible) {
      settingCloseDrawer?.()
      return
    }
    settingCloseDrawer = openDrawer('setting', () => {
      globalState.isSettingDrawerVisible = false
    })
  },
)
</script>

<template>
  <div id="setting">
    <!-- Drawer: height仅在位置是 top 和 bottom 时生效 -->
    <NTDrawer
      v-model:open="globalState.isSettingDrawerVisible"
      :width="750"
      :height="500"
      :placement="localConfig.general.drawerPlacement"
      :closable="false"
      teleport-to="#setting"
    >
      <SettingPaneContent />
    </NTDrawer>
  </div>
</template>
