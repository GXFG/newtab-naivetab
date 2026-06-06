<script setup lang="ts">
/**
 * NTPopover — NaiveTab 弹出层组件
 *
 * 基于 Reka UI PopoverRoot/PopoverTrigger/PopoverPortal/PopoverContent 二次封装。
 * 样式由 src/styles/reka/popover.css 控制。
 *
 * @example
 * <!-- hover -->
 * <NTPopover trigger="hover" placement="top">
 *   <template #trigger><NButton>悬浮</NButton></template>
 *   弹出内容
 * </NTPopover>
 * <!-- manual -->
 * <NTPopover :show="visible" trigger="manual">
 *   <template #trigger><div @mouseenter="visible=true">...</div></template>
 *   内容
 * </NTPopover>
 */
import { ref, computed, useAttrs } from 'vue'
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  PopoverArrow,
} from 'reka-ui'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  show?: boolean
  trigger?: 'hover' | 'click' | 'manual'
  placement?: 'top' | 'bottom' | 'left' | 'right'
  openDelay?: number
  closeDelay?: number
  /** @deprecated 用 openDelay/closeDelay 替代 */
  delay?: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  clickoutside: []
}>()

const attrs = useAttrs()

const internalOpen = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | null = null

const isOpen = computed(() =>
  props.trigger === 'manual' ? (props.show ?? false) : internalOpen.value,
)

const setOpen = (v: boolean) => {
  if (props.trigger === 'manual') {
    emit('update:show', v)
  } else {
    internalOpen.value = v
    emit('update:show', v)
  }
}

const openDelayMs = computed(() => props.openDelay ?? props.delay ?? 0)
const closeDelayMs = computed(() => props.closeDelay ?? props.delay ?? 100)

const handleEnter = () => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  if (openDelayMs.value > 0) {
    closeTimer = setTimeout(() => setOpen(true), openDelayMs.value)
  } else {
    setOpen(true)
  }
}
const handleLeave = () => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  closeTimer = setTimeout(() => setOpen(false), closeDelayMs.value)
}
const onUpdateOpen = (v: boolean) => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  // Reka 请求关闭时（Escape / 点击外部），同步状态
  if (!v) setOpen(false)
}
</script>

<template>
  <PopoverRoot
    :open="isOpen"
    :disabled="disabled"
    @update:open="onUpdateOpen"
  >
    <PopoverTrigger
      as="div"
      class="reka-popover__trigger"
      :disabled="disabled"
      @mouseenter="trigger === 'hover' && !disabled && handleEnter()"
      @mouseleave="trigger === 'hover' && !disabled && handleLeave()"
      @click="trigger === 'click' && !disabled ? setOpen(!isOpen) : undefined"
    >
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side="placement ?? 'top'"
        :side-offset="8"
        class="reka-popover"
        v-bind="attrs"
        @mouseenter="trigger === 'hover' && handleEnter()"
        @mouseleave="trigger === 'hover' && handleLeave()"
        @interact-outside="emit('clickoutside')"
      >
        <PopoverArrow class="reka-popover__arrow" />
        <slot />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
