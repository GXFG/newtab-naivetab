<script setup lang="ts">
/**
 * NTSpin — NaiveTab 加载动画组件
 *
 * 纯 CSS 旋转动画，无 Reka 交互。
 * 样式由 src/styles/reka/spin.css 控制。
 *
 * @example
 * <NTSpin :show="loading">
 *   <div>内容</div>
 * </NTSpin>
 */
defineProps<{
  show?: boolean
}>()
</script>

<template>
  <div
    class="reka-spin"
    :class="{ 'reka-spin--active': show }"
  >
    <div
      v-if="show"
      class="reka-spin__indicator"
    />
    <slot />
  </div>
</template>
