<script setup lang="ts">
/**
 * NTScrollArea — NaiveTab 自定义滚动区域
 *
 * 基于 Reka UI ScrollArea 封装。隐藏原生滚动条，使用统一的 macOS 风格
 * 自定义滚动条（悬停显示，滚动后渐变消失），跨平台视觉一致。
 *
 * @example
 * <!-- 基础用法：垂直滚动 -->
 * <NTScrollArea style="height: 200px">
 *   <div v-for="i in 50" :key="i">item {{ i }}</div>
 * </NTScrollArea>
 *
 * <!-- 始终显示滚动条 -->
 * <NTScrollArea type="always" style="height: 300px">
 *   ...
 * </NTScrollArea>
 */
import {
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaCorner,
} from 'reka-ui'

import { ref } from 'vue'

withDefaults(
  defineProps<{
    /** 滚动条显隐行为：hover（悬停/滚动时出现）/ always（始终显示）/ auto（溢出时始终显示）/ scroll（滚动时出现）/ glimpse（快速闪现） */
    type?: 'auto' | 'always' | 'scroll' | 'hover' | 'glimpse'
    /** type 为 'scroll' 或 'hover' 时，停止交互后隐藏延迟（ms） */
    scrollHideDelay?: number
    /** 是否作为子元素渲染（避免多余 DOM 层级） */
    asChild?: boolean
  }>(),
  {
    type: 'hover',
    scrollHideDelay: 600,
    asChild: false,
  },
)

const rootRef = ref()

defineExpose({
  /** 滚动到顶部 */
  scrollTop: () => rootRef.value?.scrollTop(),
  /** 滚动到左上角 */
  scrollTopLeft: () => rootRef.value?.scrollTopLeft(),
})
</script>

<template>
  <ScrollAreaRoot
    ref="rootRef"
    :type="type"
    :scroll-hide-delay="scrollHideDelay"
    :as-child="asChild"
    class="reka-scroll-area"
  >
    <ScrollAreaViewport class="reka-scroll-area__viewport">
      <slot />
    </ScrollAreaViewport>

    <ScrollAreaScrollbar
      orientation="vertical"
      class="reka-scroll-area__scrollbar"
    >
      <ScrollAreaThumb class="reka-scroll-area__thumb" />
    </ScrollAreaScrollbar>

    <ScrollAreaCorner class="reka-scroll-area__corner" />
  </ScrollAreaRoot>
</template>
