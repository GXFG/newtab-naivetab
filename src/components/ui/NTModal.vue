<script setup lang="ts">
/**
 * NTModal — NaiveTab 模态框组件
 *
 * 基于 Reka UI Dialog 原语封装，居中模态框 + 半透明遮罩。
 * 对标 Naive UI NModal 核心 API。
 *
 * @example
 * <NTModal v-model:open="visible" title="标题">
 *   <p>模态框内容</p>
 * </NTModal>
 */
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui'
import { computed, toRefs } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    width?: number | string
    maskClosable?: boolean
  }>(),
  {
    title: undefined,
    width: 480,
    maskClosable: true,
  },
)

const { title, maskClosable } = toRefs(props)

const open = defineModel<boolean>('open', { required: true })

const contentStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

const onClose = () => {
  open.value = false
}
</script>

<template>
  <DialogRoot
    v-model:open="open"
    :modal="true"
  >
    <DialogPortal>
      <DialogOverlay
        class="reka-modal__overlay"
        :class="{ 'reka-modal__overlay--closable': maskClosable }"
      />
      <DialogContent
        class="reka-modal"
        :style="contentStyle"
        @escape-key-down.prevent="onClose"
        @pointer-down-outside.prevent="maskClosable ? onClose : undefined"
      >
        <DialogTitle
          v-if="title"
          class="reka-modal__title"
        >
          {{ title }}
        </DialogTitle>
        <DialogTitle
          v-else
          class="sr-only"
        >
          Dialog
        </DialogTitle>
        <DialogDescription class="sr-only" />

        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
