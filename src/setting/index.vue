<script setup lang="ts">
import { localConfig } from '@/logic/config/state'
import { globalState, openDrawer } from '@/logic/store/state'
import SettingPaneContent from './SettingPaneContent.vue'

let settingCloseDrawer: (() => void) | undefined

/**
 * 使用 flex 布局替代 JS 测量约束高度。
 * NDrawer 有固定 height=500，通过 flex 链从上往下传递高度约束，
 * 不再需要通过 ResizeObserver 读取 .n-drawer-body-content-wrapper 的 height
 * 来设置 .n-tab-pane 和 .n-tabs-nav-scroll-wrapper 的固定高度。
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
  <!-- Teleport 目标容器（BackgroundDrawer / PresetThemeDrawer 挂载点） -->
  <div id="background__drawer" />
  <div id="preset-theme__drawer" />

  <div id="setting">
    <!-- Drawer: height仅在位置是 top 和 bottom 时生效 -->
    <NDrawer
      v-model:show="globalState.isSettingDrawerVisible"
      class="drawer-wrap"
      :width="750"
      :height="500"
      :placement="localConfig.general.drawerPlacement"
      show-mask="transparent"
      :trap-focus="false"
      to="#setting"
    >
      <NDrawerContent class="setting__content">
        <SettingPaneContent />
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
