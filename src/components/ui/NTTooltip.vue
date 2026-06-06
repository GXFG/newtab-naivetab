<script setup lang="ts">
/**
 * NTTooltip — NaiveTab 文字提示组件
 *
 * 基于 Reka UI TooltipProvider/TooltipRoot/TooltipTrigger/TooltipContent 二次封装。
 * 样式由 src/styles/reka/tooltip.css 控制。
 *
 * @example
 * <NTTooltip placement="bottom">
 *   <template #trigger><button>悬浮</button></template>
 *   提示文字
 * </NTTooltip>
 */
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui'

defineProps<{
  placement?: 'top' | 'bottom' | 'left' | 'right'
  disabled?: boolean
  /** 显示延迟（ms），默认 400 */
  delayDuration?: number
}>()
</script>

<template>
  <TooltipProvider :delay-duration="delayDuration ?? 400">
    <TooltipRoot :disabled="disabled">
      <TooltipTrigger
        as="div"
        class="reka-tooltip__trigger"
      >
        <slot name="trigger" />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side="placement ?? 'top'"
          :side-offset="6"
          class="reka-tooltip"
        >
          <slot />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
