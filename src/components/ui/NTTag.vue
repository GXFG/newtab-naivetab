<script setup lang="ts">
/**
 * NTTag — NaiveTab 标签组件
 *
 * 纯静态视觉标签，无 Reka 交互（对标 Radix Themes Badge）。
 * 支持 closable 关闭按钮和 primary/default 两种类型。
 * 样式由 src/styles/reka/tag.css 中的 .reka-tag 系列类控制。
 *
 * @example
 * <NTTag>标签</NTTag>
 * <NTTag type="primary">主要</NTTag>
 * <NTTag closable @close="handleClose">可关闭</NTTag>
 */
defineProps<{
  type?: 'default' | 'primary' | 'success' | 'error' | 'info'
  closable?: boolean
  bordered?: boolean
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <span
    class="reka-tag"
    :class="{
      'reka-tag--primary': type === 'primary',
      'reka-tag--success': type === 'success',
      'reka-tag--error': type === 'error',
      'reka-tag--info': type === 'info',
      'reka-tag--bordered': bordered !== false,
    }"
  >
    <slot />
    <button
      v-if="closable"
      type="button"
      class="reka-tag__close reka-focus-visible"
      aria-label="Close"
      @click.stop="$emit('close')"
    >
      <svg
        viewBox="0 0 10 10"
        class="reka-tag__close-icon"
        aria-hidden="true"
      >
        <path
          d="M1 1l8 8M9 1l-8 8"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </span>
</template>
