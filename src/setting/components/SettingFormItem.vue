<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Transition, computed } from 'vue'
import { ICONS } from '@/logic/constants/icons'
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
    /** 警告信息，有值时显示带警告图标的提示卡片，支持单条或多条 */
    warningMessage?: string | string[]
  }>(),
  {
    labelWidth: 120,
    label: undefined,
    tipContent: undefined,
    tipLink: undefined,
    alignItems: 'center' as 'center' | 'flex-start',
    warningMessage: undefined,
  },
)

/**
 * 规范化警告消息为数组，过滤空值
 */
const warnings = computed(() => {
  const msgs = Array.isArray(props.warningMessage)
    ? props.warningMessage
    : [props.warningMessage]
  return msgs.filter(Boolean) as string[]
})
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

    <Transition name="warning-fade">
      <div
        v-if="warnings.length"
        class="warning-list"
      >
        <div
          v-for="msg in warnings"
          :key="msg"
          class="setting-form-item__warning"
        >
          <Icon
            :icon="ICONS.warning"
            class="warning__icon"
          />
          <span class="warning__text">{{ msg }}</span>
        </div>
      </div>
    </Transition>

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
    background-color: var(--nt-gray-ghost);
  }
}

.form-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;

  &:has(+ .tip-inline) {
    padding-bottom: 4px;
  }

  &:has(+ .warning-list) {
    padding-bottom: 4px;
  }

  &.form-item--flex-start {
    align-items: flex-start;

    .form-item__label {
      padding-top: 3px;
    }
  }

  &:not(:has(+ .tip-inline)):not(:has(+ .warning-list)) {
    border-bottom: 1px solid var(--nt-gray-light);
  }
}

.tip-inline {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 0 var(--space-3) var(--space-3);
  font-size: var(--text-xs);
  color: var(--nt-text-secondary);
  line-height: 1.5;
  border-bottom: 1px solid var(--nt-gray-light);

  .tip__icon {
    flex-shrink: 0;
    font-size: 12px;
  }

  .tip__text {
    flex: 1;
    min-width: 0;
  }
}

.setting-form-item__warning {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 0 var(--space-3) var(--space-3);
  font-size: var(--text-xs);
  color: var(--color-error);
  line-height: 1.5;

  .warning__icon {
    flex-shrink: 0;
    font-size: 12px;
  }

  .warning__text {
    flex: 1;
    min-width: 0;
  }
}

/* 多条警告时增加间距 */
.setting-form-item__warning + .setting-form-item__warning {
  padding-top: 0;
  margin-top: -4px;
}

.warning-fade-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.warning-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.warning-fade-enter-from,
.warning-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.form-item__label {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-base);
  color: var(--nt-text-primary);
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
  :deep(.reka-popover__trigger) {
    flex-shrink: 0;
  }
}
</style>
