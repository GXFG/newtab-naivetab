<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { globalState } from '@/logic/store/state'
import { localState } from '@/logic/config/state'
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

/**
 * 注入 CSS 变量，nav 背景和 divider 文字背景使用项目 token，
 * 确保 drawer/page 双模式一致。
 */
const cssVars = computed(() => ({
  '--nt-setting-nav-bg':
    localState.value.currAppearanceCode === 0 ? '#fff' : 'rgb(24, 24, 28)',
}))

const contentRef = ref<HTMLElement | null>(null)

const onTabClick = (code: string) => {
  globalState.currSettingTabCode = code
  contentRef.value?.scrollTo({ top: 0, behavior: 'instant' })
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
    :id="isDrawer ? 'setting-tabs' : 'setting-tabs--page'"
    class="setting-tabs"
    :style="cssVars"
  >
    <!-- 左侧 nav -->
    <div class="setting-tabs__nav">
      <div
        v-for="item of tabPaneList"
        :key="item.code"
        class="setting-tabs__nav-item"
        :class="{
          'setting-tabs__nav-item--active':
            globalState.currSettingTabCode === item.code,
          'setting-tabs__nav-item--group-start': groupLabelMap.has(item.code),
        }"
        @click="onTabClick(item.code)"
      >
        <template v-if="groupLabelMap.has(item.code)">
          <div class="group-divider">
            <span class="group-divider__text">{{
              $t(groupLabelMap.get(item.code)!)
            }}</span>
          </div>
        </template>
        <div
          class="nav-item__icon"
          :style="`font-size: ${item.iconSize}px`"
        >
          <Icon :icon="item.iconName" />
        </div>
        <span class="nav-item__text">{{ $t(item.labelKey || '') }}</span>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div
      ref="contentRef"
      class="setting-tabs__content"
    >
      <KeepAlive>
        <component
          :is="activeComponent"
          :key="globalState.currSettingTabCode"
        />
      </KeepAlive>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   布局：纯 flex，不依赖任何 JS 测量或 ResizeObserver
   ============================================================ */
.setting-tabs {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  /* ── 左侧 nav ── */
  .setting-tabs__nav {
    flex-shrink: 0;
    padding: 10px 8px;
    background: var(--nt-setting-nav-bg);
    border-right: 1px solid var(--nt-gray-moderate);
    overflow-y: auto;
    user-select: none;
    scrollbar-width: thin;
    scrollbar-color: var(--nt-gray-medium) transparent;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--nt-gray-medium);
      border-radius: var(--radius-pill);
    }
  }

  /* ── nav 条目 ── */
  .setting-tabs__nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 14px;
    position: relative;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      background var(--transition-base),
      color var(--transition-fast);
    letter-spacing: 0.1px;

    &:hover {
      background: var(--nt-gray-minimal);
    }

    &.setting-tabs__nav-item--active {
      background: color-mix(in srgb, var(--nt-primary-color) 14%, transparent);
      color: var(--nt-primary-color);

      .nav-item__icon {
        opacity: 1;
        color: var(--nt-primary-color);
      }

      .nav-item__text {
        color: var(--nt-primary-color);
        font-weight: 600;
      }

      /* 左侧激活指示线 */
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 70%;
        background: var(--nt-primary-color);
        border-radius: 2px;
      }
    }

    /* 分组分隔线 */
    &.setting-tabs__nav-item--group-start {
      margin-top: 30px;
      position: relative;

      .group-divider {
        position: absolute;
        top: -22px;
        left: 0;
        right: 0;
        text-align: center;
        padding: 0 4px;

        .group-divider__text {
          display: inline-block;
          position: relative;
          z-index: 1;
          padding: 0 10px;
          font-size: 10px;
          font-weight: 500;
          color: var(--nt-text-tertiary);
          background: var(--nt-setting-nav-bg);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        &::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 8px;
          right: 8px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--nt-gray-heavy) 20%,
            var(--nt-gray-heavy) 80%,
            transparent
          );
          opacity: 1;
          z-index: 0;
        }
      }
    }
  }

  /* nav 图标 & 文字 */
  .nav-item__icon {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 22px;
    flex-shrink: 0;
    transition:
      color var(--transition-fast),
      opacity var(--transition-fast);
  }

  .nav-item__text {
    font-size: var(--text-base);
    user-select: none;
    letter-spacing: 0.1px;
  }

  /* ── 右侧内容区 ── */
  .setting-tabs__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    background: var(--nt-setting-nav-bg);
    user-select: none;
    scrollbar-width: thin;
    scrollbar-color: var(--nt-gray-medium) transparent;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--nt-gray-medium);
      border-radius: var(--radius-pill);
    }
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

<style>
/* ============================================================
   page 模式专用（options 页面）
   ============================================================ */
#setting-tabs--page.setting-tabs {
  flex: 1;
  min-height: 0;
}

#setting-tabs--page .setting-tabs__content {
  padding: 0 16px 50px 16px;
}
</style>
