<script setup lang="ts">
/**
 * NTCheckbox — NaiveTab 复选框组件
 *
 * 基于 Reka UI CheckboxRoot 二次封装。
 * 样式由 src/styles/reka/checkbox.css 中的 .reka-checkbox 系列类控制，
 * 支持浅色/深色模式自动切换。
 *
 * 勾号 SVG 始终渲染，通过 CSS opacity + scale 控制显隐，
 * 避免 CheckboxIndicator 的 Presence 挂载/卸载导致的布局抖动。
 *
 * @example
 * <NTCheckbox v-model:value="checked" />
 * <NTCheckbox v-model:value="checked" disabled />
 */
import { CheckboxRoot } from 'reka-ui'

defineProps<{
  disabled?: boolean
}>()

const checked = defineModel<boolean>('value', { required: true })
</script>

<template>
  <CheckboxRoot
    v-model="checked"
    :disabled="disabled"
    class="reka-checkbox reka-focus-visible"
  >
    <!-- 勾号始终在 DOM 中，CSS 控制显隐，无布局抖动 -->
    <svg
      viewBox="0 0 12 12"
      class="reka-checkbox__check"
      aria-hidden="true"
    >
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="white"
        stroke-width="1.75"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </CheckboxRoot>
</template>
