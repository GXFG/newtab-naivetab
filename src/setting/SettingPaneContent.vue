<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { globalState } from '@/logic/store'
import { settingsList, SETTING_GROUPS } from './registry'

const props = withDefaults(
  defineProps<{
    /** 'drawer': NDrawer 容器内，需同步 nav 高度；'page': 全屏页面，自然流动 */
    layout?: 'drawer' | 'page'
    /** drawer 模式下由父组件传入的内容区高度 */
    settingContentHeight?: number
  }>(),
  {
    layout: 'drawer',
    settingContentHeight: 0,
  },
)

const settingContentHeightStyle = computed(
  () => `${props.settingContentHeight}px`,
)

const cssVars = computed(() => ({
  '--nt-setting-content-height': settingContentHeightStyle.value,
}))

const isDrawer = computed(() => props.layout === 'drawer')

const tabPaneList = computed(() => settingsList)

const onTabsChange = (tabCode: string) => {
  globalState.currSettingTabCode = tabCode
}

// ── 分组逻辑 ──
// SETTING_GROUPS 定义了 5 个分组（global / keyboardAndBookmark / timeAndDate / tool / other）。
// NTabs 的左侧 nav 中，从第二个分组开始，其首个 tab 上方显示分组标题分隔线。
// groupStartSet 用于给 tab 添加 CSS class，groupWithFirstItem 提供对应的 labelKey。
const groupsWithFirstItem = computed(() => {
  const result: Array<{ firstCode: settingPanes; labelKey: string }> = []
  SETTING_GROUPS.forEach((group, index) => {
    if (index > 0 && group.items.length > 0) {
      result.push({
        firstCode: group.items[0].code,
        labelKey: group.labelKey,
      })
    }
  })
  return result
})

const groupStartSet = computed(() => {
  const set = new Set<settingPanes>()
  groupsWithFirstItem.value.forEach((item) => set.add(item.firstCode))
  return set
})

const getGroupLabel = (code: settingPanes): string => {
  return (
    groupsWithFirstItem.value.find((item) => item.firstCode === code)
      ?.labelKey || ''
  )
}
</script>

<template>
  <div
    :id="isDrawer ? 'setting-tabs' : 'setting-tabs--page'"
    class="setting-tabs"
    :style="cssVars"
  >
    <NTabs
      type="line"
      :value="globalState.currSettingTabCode"
      placement="left"
      animated
      @update:value="onTabsChange"
    >
      <NTabPane
        v-for="item of tabPaneList"
        :key="item.code"
        :name="item.code"
        :tab="$t(item.labelKey || '')"
      >
        <template #tab>
          <div
            class="tab__title"
            :class="{ 'tab__title--group-start': groupStartSet.has(item.code) }"
          >
            <template v-if="groupStartSet.has(item.code)">
              <div class="group-divider">
                <span class="group-divider__text">{{
                  $t(getGroupLabel(item.code))
                }}</span>
              </div>
            </template>
            <div
              class="title__icon"
              :style="`font-size: ${item.iconSize}px`"
            >
              <Icon :icon="item.iconName" />
            </div>
            <span class="title__text">{{ $t(item.labelKey || '') }}</span>
          </div>
        </template>

        <template #default>
          <component :is="item.component" />
        </template>
      </NTabPane>
    </NTabs>
  </div>
</template>

<style>
/* ============================================================
   通用样式：两种模式共用（通过 .setting-tabs 类匹配）
   ============================================================ */
.setting-tabs {
  .n-radio {
    width: auto;
  }
  .n-divider:not(.n-divider--vertical) {
    margin-top: var(--space-4);
    margin-bottom: var(--space-3);
  }
  .n-divider .n-divider__title {
    font-size: var(--text-md) !important;
    font-weight: 500;
    opacity: var(--opacity-primary);
    letter-spacing: 0.1px;
  }

  /* nav 基础样式 */
  .n-tabs .n-tabs-nav {
    padding: 10px 4px 4px 4px;
    background: var(--n-color);

    .n-tabs-tab {
      border-radius: var(--radius-md);
      transition: background var(--transition-base);
    }

    .tab__title {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 5px;
      .title__icon {
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: var(--opacity-secondary);
        transition: opacity var(--transition-fast);
      }
      .title__text {
        user-select: none;
        letter-spacing: 0.1px;
      }
    }

    .n-tabs-tab--active .tab__title .title__icon {
      opacity: 1;
    }
  }

  /* ——— 分组分隔线（两种模式共用） ——— */
  .n-tabs .n-tabs-nav {
    .n-tabs-nav-scroll-wrapper {
      .n-tabs-tab:has(.tab__title--group-start) {
        margin-top: 20px;
        position: relative;
      }

      .tab__title--group-start .group-divider {
        position: absolute;
        top: -18px;
        left: 0;
        right: 0;
        text-align: center;
        background: var(--n-color);
        padding: 0 4px;

        .group-divider__text {
          display: inline-block;
          padding: 0 10px;
          font-size: 10px;
          font-weight: 500;
          color: var(--n-text-color-3);
          background: var(--n-color);
          opacity: 0.45;
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
            var(--n-tab-border-color) 20%,
            var(--n-tab-border-color) 80%,
            transparent
          );
          opacity: 1;
          z-index: 0;
        }
      }
    }
  }

  /* ——— 滚动条样式（两种模式共用） ——— */
  .n-tab-pane {
    user-select: none;
    scrollbar-width: thin;
    scrollbar-color: var(--n-tab-border-color) transparent;
    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: var(--n-tab-border-color);
      border-radius: var(--radius-pill);
    }
  }
}

/* 抽屉 NDrawerContent 的 header 样式 */
.n-drawer-content .n-drawer-header {
  font-size: 15px !important;
  font-weight: 500 !important;
  padding: 12px 16px !important;
}

/* ============================================================
   drawer 模式专用
   这些样式需要穿透到 #setting 下的 NDrawer 内部结构
   NDrawer 渲染为 #setting 的子元素，.n-tab-pane 在 NDrawer 内部
   ============================================================ */
#setting {
  .n-drawer
    .n-drawer-content.n-drawer-content--native-scrollbar
    .n-drawer-body-content-wrapper {
    padding: 0 !important;
  }
  .drawer-wrap {
    box-shadow: var(--shadow-lg) !important;
  }

  .n-tabs .n-tabs-nav {
    .n-tabs-nav-scroll-wrapper {
      height: var(--nt-setting-content-height);
    }
  }

  .n-tab-pane {
    padding: 0;
    height: var(--nt-setting-content-height);
    overflow: auto;
    box-sizing: border-box;
  }
}

/* ============================================================
   page 模式专用（options 页面）
   选择器需要匹配 #setting-tabs--page 内部的 .n-tab-pane
   （NTabs 将 pane 渲染在 teleport 中，挂载在 .setting-tabs 内部）
   ============================================================ */
#setting-tabs--page {
  .n-tabs {
    height: calc(100vh);
  }

  .n-tabs .n-tabs-nav {
    .n-tabs-nav-scroll-wrapper {
      max-height: calc(100vh - 124px);
      overflow-y: auto;
    }
  }

  .n-tab-pane {
    padding: 0 16px 50px 16px !important;
    overflow-y: auto;
    box-sizing: border-box;
  }
}
</style>
