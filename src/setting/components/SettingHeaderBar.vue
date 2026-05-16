<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { globalState } from '@/logic/store/state'

const props = defineProps<{
  title: string
}>()

const isDrawerMode = computed(() => globalState.settingMode === 'drawer')

/**
 * 预览模式：鼠标悬停时让抽屉透明化，用户可实时看到下方 newtab 页面的效果。
 * 通过切换 body.setting-preview-active CSS 类实现，对应样式在 styles/global.css 中：
 * - 抽屉透明度设为 0
 * - 遮罩背景变为透明
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

    <!-- 右侧：关闭按钮（仅抽屉模式） -->
    <div
      v-if="isDrawerMode"
      class="header-bar__action header-bar__action--close"
      @click="globalState.isSettingDrawerVisible = false"
    >
      <Icon
        :icon="ICONS.close"
        class="action__icon"
      />
    </div>
  </div>
</template>

<style scoped>
.setting-header-bar {
  padding: var(--space-3) var(--space-4);
  z-index: 2000;
  position: sticky;
  top: 0;
  width: 100%;
  background-color: var(--n-color);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--n-tab-border-color);
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
    border: 1px solid var(--n-tab-border-color);
    cursor: pointer;
    transition:
      background-color var(--transition-base),
      border-color var(--transition-base),
      color var(--transition-base),
      box-shadow var(--transition-base);
    color: var(--gray-alpha-85);
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
      background-color: var(--n-tab-border-color);
      border-color: transparent;
      color: var(--n-text-color);
      box-shadow: var(--shadow-sm);
    }

    &.header-bar__action--active {
      background-color: rgba(16, 152, 173, 0.1);
      border-color: rgba(16, 152, 173, 0.4);
      color: var(--n-primary-color, #1098ad);
      box-shadow: 0 0 0 2px rgba(16, 152, 173, 0.12);
      :root[data-theme='dark'] & {
        background-color: rgba(16, 152, 173, 0.15);
        border-color: rgba(16, 152, 173, 0.45);
        box-shadow: 0 0 0 2px rgba(16, 152, 173, 0.18);
      }
    }

    &.header-bar__action--close {
      &:hover {
        background-color: color-mix(
          in srgb,
          var(--color-error) 8%,
          transparent
        );
        border-color: color-mix(in srgb, var(--color-error) 35%, transparent);
        color: var(--color-error);
        :root[data-theme='dark'] & {
          background-color: color-mix(
            in srgb,
            var(--color-error) 15%,
            transparent
          );
          border-color: color-mix(in srgb, var(--color-error) 45%, transparent);
        }
      }
    }
  }
}
</style>
