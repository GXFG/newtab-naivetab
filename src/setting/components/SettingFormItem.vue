<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import Tips from '@/components/Tips.vue'

/**
 * SettingFormItem - 设置面板表单项原子组件
 *
 * 布局结构：[label] [control slot]
 * - label 默认文本可替换，固定宽度
 * - control 区域占据剩余空间，内容靠右对齐
 * - 纯文本 tip（无 link）常驻展示在表单项下方，灰色小字
 * - 有 link 的 tip 通过 Tips popover hover 触发，图标在 control 区右侧
 * - 锁定 min-height 28px，避免 switch 展开/收起时行高跳动
 */
const props = withDefaults(
  defineProps<{
    /** 表单项标签文本 */
    label?: string
    /** 标签宽度（px），默认 120 */
    labelWidth?: number
    /** 提示框内容 */
    tipContent?: string
    /** 提示框中的跳转链接，传入非空字符串时显示 */
    tipLink?: string
    /** 纵向对齐方式，对应 CSS align-items，默认 center，内容多行时传 flex-start */
    alignItems?: 'center' | 'flex-start'
  }>(),
  {
    labelWidth: 120,
    label: undefined,
    tipContent: undefined,
    tipLink: undefined,
    alignItems: 'center' as 'center' | 'flex-start',
  },
)
</script>

<template>
  <div class="setting-form-item-wrap">
    <div
      class="form-item"
      :class="`form-item--${alignItems}`"
    >
      <label
        v-if="label || $slots.label"
        class="form-item__label"
        :style="{ width: `${labelWidth}px` }"
      >
        <span
          v-if="label"
          class="form-item__label-text"
          >{{ label }}</span
        >
        <slot
          v-else
          name="label"
        />
      </label>

      <div class="form-item__control">
        <slot />
        <Tips
          v-if="tipContent && tipLink"
          :content="tipContent"
          link
        />
      </div>
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
.setting-form-item-wrap {
  border-radius: var(--radius-md);

  &:hover {
    background-color: var(--gray-alpha-05);
  }
}

.form-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;

  &:has(+ .tip-inline) {
    padding-bottom: 4px;
  }

  &.form-item--flex-start {
    align-items: flex-start;

    .form-item__label {
      padding-top: 3px;
    }
  }

  &:not(:has(+ .tip-inline)) {
    border-bottom: 1px solid var(--gray-alpha-10);
  }
}

.tip-inline {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 0 var(--space-3) var(--space-3);
  font-size: var(--text-xs);
  color: var(--n-text-color-3);
  line-height: 1.5;
  opacity: var(--opacity-muted);
  border-bottom: 1px solid var(--gray-alpha-10);

  .tip__icon {
    flex-shrink: 0;
    font-size: 12px;
  }

  .tip__text {
    flex: 1;
    min-width: 0;
  }
}

.form-item__label {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-base);
  color: var(--n-text-color-2);
  cursor: default;
  user-select: none;

  .form-item__label-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.form-item__control {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  min-width: 0;
  min-height: 28px;
}
</style>
