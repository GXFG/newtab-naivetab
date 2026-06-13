<script setup lang="ts">
/**
 * @module SettingHeaderBar
 *
 * Setting 面板右侧顶部标题栏，由 SettingPaneContent 统一渲染（各 pane 不再自行引用）。
 *
 * 功能：标题 + 预览按钮（hover 透视）+ 打开新标签页按钮 + 关闭按钮（仅 drawer 模式）。
 * 该组件固定在滚动区域之外，不随下方内容滚动。
 */
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { globalState } from '@/logic/store/state'

const props = defineProps<{
  title: string
}>()

const isDrawerMode = computed(() => globalState.settingMode === 'drawer')

/**
 * 预览模式：鼠标悬停时让抽屉透明化，用户可实时看到下方 newtab 页面的效果。
 * 通过切换 body.setting-preview-active CSS 类实现，对应样式在 styles/setting-utils.css 中：
 * - 抽屉透明度设为 0
 * 鼠标离开后自动恢复，不影响任何配置数据。
 */
const isPreviewing = ref(false)

const handlerPreviewEnter = () => {
  isPreviewing.value = true
  document.body.classList.add('setting-preview-active')
}

const handlerPreviewLeave = () => {
  isPreviewing.value = false
  document.body.classList.remove('setting-preview-active')
}

const openInNewTab = () => {
  const params = new URLSearchParams()
  const { currSettingTabCode, currSettingAnchor } = globalState
  if (currSettingTabCode) {
    params.set('tab', currSettingTabCode)
    if (currSettingAnchor) params.set('anchor', currSettingAnchor)
  } else {
    params.set('tab', 'general')
  }
  const url = chrome.runtime.getURL(
    `dist/options/index.html?${params.toString()}`,
  )
  chrome.tabs.create({ url })
}
</script>

<template>
  <div class="setting-header-bar">
    <!-- 左侧：标题 + 预览/新标签页按钮 -->
    <div class="header-bar__left">
      <p class="header-bar__title">{{ props.title }}</p>

      <div
        v-if="isDrawerMode"
        class="header-bar__action"
        :class="{ 'header-bar__action--active': isPreviewing }"
        @mouseenter="handlerPreviewEnter"
        @mouseleave="handlerPreviewLeave"
      >
        <Icon
          :icon="ICONS.preview"
          class="action__icon"
        />
        <span class="action__label">{{ $t('common.preview') }}</span>
      </div>

      <template v-if="isDrawerMode">
        <div
          class="header-bar__action"
          @click="openInNewTab"
        >
          <Icon
            :icon="ICONS.openInNew"
            class="action__icon"
          />
          <span class="action__label">{{ $t('setting.openInNewTab') }}</span>
        </div>
      </template>
    </div>

    <!-- 右侧：关闭按钮（仅抽屉模式），与 NTDrawer close 设计一致 -->
    <button
      v-if="isDrawerMode"
      type="button"
      class="reka-drawer__close reka-focus-visible setting-header-bar__close"
      @click="globalState.isSettingDrawerVisible = false"
    >
      <Icon :icon="ICONS.close" />
    </button>
  </div>
</template>

<style>
.setting-header-bar {
  padding: var(--space-3) var(--space-4);
  width: 100%;
  background-color: var(--nt-setting-nav-bg, #fff);
  border-bottom: 1px solid var(--nt-gray-light);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-bar__left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .header-bar__title {
    font-size: var(--text-md);
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    letter-spacing: -0.1px;
  }

  .header-bar__action {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 4px var(--space-2);
    border-radius: var(--radius-md);
    border: 1px solid var(--nt-gray-moderate);
    cursor: pointer;
    transition:
      background-color var(--transition-base),
      border-color var(--transition-base),
      color var(--transition-base),
      box-shadow var(--transition-base);
    color: var(--nt-text-primary);
    user-select: none;
    flex-shrink: 0;

    .action__icon {
      font-size: 13px;
      flex-shrink: 0;
    }

    .action__label {
      font-size: var(--text-xs);
      line-height: 1;
      letter-spacing: 0.1px;
    }

    &:hover {
      background-color: var(--nt-gray-moderate);
      border-color: transparent;
      color: var(--nt-text-primary);
      box-shadow: var(--shadow-sm);
    }

    &.header-bar__action--active {
      background-color: color-mix(
        in srgb,
        var(--nt-primary-color) 10%,
        transparent
      );
      border-color: color-mix(
        in srgb,
        var(--nt-primary-color) 40%,
        transparent
      );
      color: var(--nt-primary-color);
      box-shadow: 0 0 0 2px
        color-mix(in srgb, var(--nt-primary-color) 12%, transparent);
    }
  }

  /* close 按钮微调：对齐 header 右侧，与 NTDrawer close 一致 */
  .setting-header-bar__close {
    margin-left: var(--space-2);
  }
}

:root[data-theme='dark'] .setting-header-bar .header-bar__action--active,
.dark .setting-header-bar .header-bar__action--active {
  background-color: color-mix(
    in srgb,
    var(--nt-primary-color) 15%,
    transparent
  );
  border-color: color-mix(in srgb, var(--nt-primary-color) 45%, transparent);
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--nt-primary-color) 18%, transparent);
}
</style>
