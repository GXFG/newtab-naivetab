<script setup lang="ts">
/**
 * @module WidgetErrorBoundary
 * @description Widget 级错误边界 —— 捕获子组件渲染/生命周期异常，
 *   防止单个 Widget 崩溃导致整个新标签页白屏。
 * @dependencies Vue 3 onErrorCaptured
 */
import { onErrorCaptured, ref } from 'vue'

const props = defineProps<{ code: string }>()
const hasError = ref(false)

onErrorCaptured((err, _instance, info) => {
  hasError.value = true
  console.error(`[WidgetErrorBoundary] ${props.code} crashed at ${info}:`, err)
  // 返回 false 允许错误继续向上传播（不阻断全局错误处理）
  return false
})
</script>

<template>
  <template v-if="!hasError">
    <slot />
  </template>
  <div
    v-else
    class="widget-error-boundary"
  >
    <span class="widget-error-boundary__text">
      {{ $t('common.widgetError').replace('__code__', code) }}
    </span>
  </div>
</template>

<style scoped>
.widget-error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--color-warning) 50%, transparent);
  background-color: color-mix(in srgb, var(--color-warning) 5%, transparent);
}

.widget-error-boundary__text {
  font-size: 12px;
  color: var(--color-warning);
}
</style>
