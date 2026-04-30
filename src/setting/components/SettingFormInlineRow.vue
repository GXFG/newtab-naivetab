<script setup lang="ts">
/**
 * 多字段同行排列容器，替代 `<div class="setting-form-wrap">` 模式。
 * 用于多个 ColorField/FontField/SettingFormItem 在同一行换行展示。
 */
defineProps<{
  title?: string
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
    </div>
  </div>
</template>

<style scoped>
.setting-inline-row-wrap {
  border-bottom: 1px solid var(--gray-alpha-10);

  .inline-row__title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--n-text-color-3);
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
      border-right: 1px solid var(--gray-alpha-10);
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
</style>
