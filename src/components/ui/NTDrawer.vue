<script setup lang="ts">
/**
 * NTDrawer — NaiveTab 侧滑抽屉组件
 *
 * 基于 Reka UI Dialog 原语封装，模拟 Naive UI NDrawer 的侧滑行为。
 *
 * 关闭动画策略（对标 Naive UI）：
 *   关闭请求到达时，先触发 CSS transition 滑出动画，等动画完成后
 *   再通知 DialogRoot 关闭。而非直接设 open=false 让 Reka 立即
 *   unmount（这样退出动画会被截断）。
 *
 * ESC 关闭由 drawerStack 统一管理，Reka 内置 ESC/外部点击均被 prevent。
 *
 * @example
 * <NTDrawer v-model:open="visible" title="标题" placement="right" :width="500">
 *   <p>抽屉内容</p>
 * </NTDrawer>
 */
import {
  DialogRoot,
  DialogPortal,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { computed, ref, watch, onBeforeUnmount } from 'vue'

/**
 * 全局 drawer 深度计数器，确保嵌套 drawer 的 z-index 逐层递增。
 */
let globalDepth = 0
const BASE_Z = 1000
/** 退场动画时长，需与 CSS --transition-drawer 的 duration 一致 */
const LEAVE_DURATION = 300

const props = withDefaults(
  defineProps<{
    title?: string
    closable?: boolean
    width?: number | string
    height?: number | string
    placement?: 'left' | 'right' | 'top' | 'bottom'
    teleportTo?: string
  }>(),
  {
    title: undefined,
    closable: true,
    width: 500,
    height: undefined,
    placement: 'right',
    teleportTo: 'body',
  },
)

const modelOpen = defineModel<boolean>('open', { required: true })

/**
 * 视觉状态机：
 *   'closed'  → 完全关闭（DialogRoot open=false）
 *   'open'    → 完全打开
 *   'leaving' → 正在执行退出动画（视觉上滑出，DialogRoot 仍为 open）
 */
type VisualState = 'closed' | 'open' | 'leaving'
const visualState = ref<VisualState>(modelOpen.value ? 'open' : 'closed')

/** DialogRoot 的实际 open 状态 */
const dialogOpen = ref(modelOpen.value)

/** 退场定时器 */
let leaveTimer: ReturnType<typeof setTimeout> | null = null

const clearLeaveTimer = () => {
  if (leaveTimer) {
    clearTimeout(leaveTimer)
    leaveTimer = null
  }
}

/** 执行关闭：先触发退出动画，动画结束后再关 DialogRoot */
const startClose = () => {
  clearLeaveTimer()
  visualState.value = 'leaving'
  leaveTimer = setTimeout(() => {
    dialogOpen.value = false
    visualState.value = 'closed'
    leaveTimer = null
  }, LEAVE_DURATION)
}

/** 执行打开：立即打开 DialogRoot + 视觉 */
const startOpen = () => {
  clearLeaveTimer()
  dialogOpen.value = true
  visualState.value = 'open'
}

/**
 * 关闭来源：
 *   a) DialogClose 按钮 → handleCloseBtn()
 *   b) modelOpen 变为 false（父组件控制，如 drawerStack ESC）
 *   c) 组件卸载（onBeforeUnmount 兜底）
 */
const handleCloseBtn = () => {
  startClose()
}

// 同步 modelOpen → internal：opening 立即响应，closing 走动画流程
watch(modelOpen, (val, oldVal) => {
  if (val && !oldVal) {
    startOpen()
  } else if (!val && oldVal) {
    // 父组件关闭（如 drawerStack ESC）→ 也需要走动画
    if (visualState.value === 'open') {
      startClose()
    }
  }
})

// 动画结束后同步 modelOpen
watch(dialogOpen, (val) => {
  if (!val && modelOpen.value) {
    modelOpen.value = false
  }
})

// 深度计数器
const depth = ref(0)
watch(dialogOpen, (val) => {
  if (val) {
    globalDepth++
    depth.value = globalDepth
  } else if (depth.value > 0) {
    globalDepth--
    depth.value = 0
  }
})

onBeforeUnmount(() => {
  clearLeaveTimer()
  if (depth.value > 0) {
    globalDepth--
    depth.value = 0
  }
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.placement === 'left' || props.placement === 'right') {
    style.width =
      typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  if (props.placement === 'top' || props.placement === 'bottom') {
    if (props.height) {
      style.height =
        typeof props.height === 'number' ? `${props.height}px` : props.height
    }
  }
  return style
})

const showHeader = computed(() => !!(props.title || props.closable))
</script>

<template>
  <DialogRoot
    v-model:open="dialogOpen"
    :modal="false"
  >
    <DialogPortal :to="teleportTo">
      <DialogContent
        force-mount
        class="reka-drawer"
        :class="[
          `reka-drawer--${placement}`,
          visualState === 'open' && 'reka-drawer--open',
          (visualState === 'closed' || visualState === 'leaving') &&
            'reka-drawer--closed',
        ]"
        :style="{ ...contentStyle, '--drawer-z': BASE_Z + depth * 100 }"
        @escape-key-down.prevent
        @pointer-down-outside.prevent
      >
        <DialogTitle
          v-if="!title"
          class="sr-only"
        >
          Dialog
        </DialogTitle>
        <DialogDescription class="sr-only">
          {{ title || 'Dialog' }}
        </DialogDescription>

        <div
          v-if="showHeader"
          class="reka-drawer__header"
        >
          <DialogTitle
            v-if="title"
            class="reka-drawer__header-title"
          >
            {{ title }}
          </DialogTitle>
          <button
            v-if="closable"
            type="button"
            class="reka-drawer__close reka-focus-visible"
            @click="handleCloseBtn"
          >
            <Icon :icon="ICONS.close" />
          </button>
        </div>

        <div class="reka-drawer__body">
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
