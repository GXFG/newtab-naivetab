<script setup lang="ts">
/**
 * @module SettingPaneContent
 *
 * Setting 面板核心布局组件，支持 drawer/page 双模式。
 *
 * 布局结构（左右分栏）：
 *   左侧 nav — NTScrollArea 包裹的分组导航列表
 *   右侧内容区 — flex column：
 *     SettingHeaderBar（固定顶部，不参与滚动）
 *     NTScrollArea.content-body（flex:1，内容滚动区域）
 *       KeepAlive → 动态面板组件（16 个 pane）
 *
 * 各 pane 组件不再自行渲染 SettingHeaderBar，由本组件根据 currSettingTabCode
 * 从 settingsList 查找对应 labelKey 统一渲染。
 */
import NTScrollArea from '@/components/ui/NTScrollArea.vue'
import { SettingHeaderBar, SettingNav } from '@/setting/components'
import { globalState } from '@/logic/store/state'
import { gaProxy } from '@/logic/utils/gtag'
import { settingsList, SETTING_GROUPS } from './registry'

const props = withDefaults(
  defineProps<{
    /** 'drawer': Drawer 容器内；'page': 全屏页面 */
    layout?: 'drawer' | 'page'
  }>(),
  {
    layout: 'drawer',
  },
)

const isDrawer = computed(() => props.layout === 'drawer')
const tabPaneList = computed(() => settingsList)

/** 当前激活的面板组件（按需加载，替代 v-for+v-show 的全量渲染） */
const activeComponent = computed(() => {
  const code = globalState.currSettingTabCode
  return settingsList.find((item) => item.code === code)?.component
})

/** 当前激活面板的标题（用于固定 HeaderBar） */
const activeTabTitle = computed(() => {
  const item = tabPaneList.value.find(
    (i) => i.code === globalState.currSettingTabCode,
  )
  return item?.labelKey ? window.$t(item.labelKey) : ''
})

const contentRef = ref<InstanceType<typeof NTScrollArea> | null>(null)

const onTabClick = (code: string) => {
  globalState.currSettingTabCode = code
  contentRef.value?.scrollTop()
  if (code.startsWith('keyboard')) {
    gaProxy('view', ['keyboard_setting'], { tab: code })
  }
}

// ── 分组逻辑 ──
// SETTING_GROUPS 定义了 5 个分组（global / keyboardAndBookmark / timeAndDate / tool / other）。
// 从第二个分组开始，其首个 tab 上方显示分组标题分隔线。
// groupLabelMap: firstCode → labelKey，同时作为该 code 是否为分组首项的判断依据。
const groupLabelMap = computed(() => {
  const map = new Map<settingPanes, string>()
  SETTING_GROUPS.forEach((group, index) => {
    if (index > 0 && group.items.length > 0) {
      map.set(group.items[0].code, group.labelKey)
    }
  })
  return map
})
</script>

<template>
  <div
    :id="isDrawer ? 'setting-board' : 'setting-board--page'"
    class="setting-board"
  >
    <SettingNav
      :tab-pane-list="tabPaneList"
      :group-label-map="groupLabelMap"
      @select="onTabClick"
    />

    <!-- 右侧内容区 -->
    <div class="setting-board__content">
      <SettingHeaderBar :title="activeTabTitle" />
      <NTScrollArea
        ref="contentRef"
        class="setting-board__content-body"
      >
        <KeepAlive>
          <component
            :is="activeComponent"
            :key="globalState.currSettingTabCode"
          />
        </KeepAlive>
      </NTScrollArea>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   布局：纯 flex，不依赖任何 JS 测量或 ResizeObserver
   ============================================================ */
.setting-board {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  /* ── 右侧内容区 ── */
  .setting-board__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: var(--nt-setting-nav-bg);
    user-select: none;
  }

  .setting-board__content-body {
    flex: 1;
    min-height: 0;
  }

  :deep(.n-divider:not(.n-divider--vertical)) {
    margin-top: var(--space-4);
    margin-bottom: var(--space-3);
  }

  :deep(.n-divider .n-divider__title) {
    font-size: var(--text-md) !important;
    font-weight: 500;
    opacity: var(--opacity-primary);
    letter-spacing: 0.1px;
  }
}
</style>
