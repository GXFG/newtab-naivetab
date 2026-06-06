<script setup lang="ts">
/**
 * NTButton — NaiveTab 按钮组件
 *
 * 纯 HTML button，无 Reka 交互。
 * 样式由 src/styles/reka/button.css 控制。
 *
 * @example
 * <NTButton type="primary" size="small">确定</NTButton>
 * <NTButton variant="text" size="tiny"><Icon :icon="ICONS.close" /></NTButton>
 */
defineProps<{
  type?: 'default' | 'primary' | 'error' | 'warning'
  size?: 'tiny' | 'small' | 'medium' | 'large'
  variant?: 'solid' | 'secondary' | 'text' | 'ghost'
  round?: boolean
  disabled?: boolean
  loading?: boolean
}>()
</script>

<template>
  <button
    type="button"
    class="reka-button reka-focus-visible"
    :class="{
      [`reka-button--${type ?? 'default'}`]: true,
      [`reka-button--${size ?? 'medium'}`]: true,
      [`reka-button--${variant ?? 'solid'}`]: true,
      'reka-button--round': round,
    }"
    :disabled="disabled || loading"
  >
    <span
      v-if="loading"
      class="reka-button__spinner"
    />
    <slot />
  </button>
</template>
