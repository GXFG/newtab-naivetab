<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import Tips from '@/components/Tips.vue'

/**
 * 多字段同行排列容器，替代 `<div class="setting-form-wrap">` 模式。
 * 用于多个 ColorField/FontField/SettingFormItem 在同一行换行展示。
 *
 * tipContent / tipLink 行为与 SettingFormItem 一致：
 * - 仅 tipContent → 行下方常驻灰色小字提示
 * - tipContent + tipLink → Tips popover hover 触发，图标在行末
 */
defineProps<{
  title?: string
  /** 提示内容 */
  tipContent?: string
  /** 提示中的跳转链接，传入非空字符串时显示 Tips popover */
  tipLink?: string
}>()
</script>

<template>
  <div class="setting-inline-row-wrap">
    <div
      v-if="title"
      class="inline-row__title"
    >
      {{ title }}
    </div>
    <div class="inline-row">
      <slot />
      <Tips
        v-if="tipContent && tipLink"
        :content="tipContent"
        link
      />
    </div>

    <p
      v-if="tipContent && !tipLink"
      class="tip-inline"
    >
      <Icon
        :icon="ICONS.info"
        class="tip__icon"
      />
      <span class="tip__text">{{ tipContent }}</span>
    </p>
  </div>
</template>

<style scoped>
.setting-inline-row-wrap {
  border-bottom: 1px solid var(--nt-gray-light);

  /* 当自身有 tip-inline 时，边框由 tip-inline 负责，避免双重边框 */
  &:has(> .tip-inline) {
    border-bottom: none;
  }

  .inline-row__title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--nt-text-tertiary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 8px 0 0 14px;
  }

  .inline-row {
    display: flex;
    flex-wrap: wrap;

    > * {
      flex: 1;
      min-width: 0;
    }

    /* 相邻子元素之间用垂直分割线 */
    > *:not(:last-child) {
      border-right: 1px solid var(--nt-gray-light);
    }

    /* 边框由外层 .setting-inline-row-wrap 统一提供，去掉内部圆角 */
    :deep(.setting-form-item-wrap) {
      border-radius: 0;

      & .form-item {
        border-bottom: none;
      }

      & .tip-inline {
        border-bottom: none;
      }
    }
  }

  /* 最后一个 inline-row 在 section 底部，由 .section__body 外边框兜底 */
  &:last-child {
    border-bottom: none;
  }
}

.tip-inline {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  color: var(--nt-text-secondary);
  line-height: 1.5;
  border-top: 1px solid var(--nt-gray-light);

  .tip__icon {
    flex-shrink: 0;
    font-size: 12px;
  }

  .tip__text {
    flex: 1;
    min-width: 0;
  }
}
</style>
