<script setup lang="ts">
/**
 * NTPopconfirm — NaiveTab 确认弹出层组件
 *
 * 基于 NTPopover 封装，在 popover 内容中增加确认/取消按钮。
 * 对标 Naive UI NPopconfirm API。
 *
 * @example
 * <NTPopconfirm @positive-click="handleDelete">
 *   <template #trigger><NButton>删除</NButton></template>
 *   确认删除吗？
 * </NTPopconfirm>
 */
import NTPopover from './NTPopover.vue'

const props = defineProps<{
  positiveText?: string
  negativeText?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'positive-click': []
  'negative-click': []
}>()

const t = (key: string) => (window as any).$t(key)

/** 展开状态，支持 v-model:show 双向绑定 */
const show = defineModel<boolean>('show')

const onPositive = () => {
  show.value = false
  emit('positive-click')
}
const onNegative = () => {
  show.value = false
  emit('negative-click')
}
</script>

<template>
  <NTPopover
    v-model:show="show"
    trigger="manual"
    placement="top"
    :disabled="disabled"
  >
    <template #trigger>
      <div @click.stop="show = !show">
        <slot name="trigger" />
      </div>
    </template>

    <div class="reka-popconfirm">
      <div class="reka-popconfirm__body">
        <slot />
      </div>
      <div class="reka-popconfirm__actions">
        <button
          type="button"
          class="reka-popconfirm__btn reka-popconfirm__btn--cancel"
          @click="onNegative"
        >
          {{ negativeText || t('common.cancel') }}
        </button>
        <button
          type="button"
          class="reka-popconfirm__btn reka-popconfirm__btn--confirm"
          @click="onPositive"
        >
          {{ positiveText || t('common.confirm') }}
        </button>
      </div>
    </div>
  </NTPopover>
</template>
