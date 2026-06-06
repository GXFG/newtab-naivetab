<script setup lang="ts">
/**
 * NTInputNumber — NaiveTab 数字输入组件
 *
 * 基于 Reka UI NumberField 原语封装，对标 Naive UI NInputNumber API。
 * 支持 v-model:value、min/max/step、size、disabled、#suffix 插槽。
 *
 * @example
 * <NTInputNumber v-model:value="num" size="small" :min="0" :max="100" :step="1" />
 */
import {
  NumberFieldRoot,
  NumberFieldInput,
  NumberFieldIncrement,
  NumberFieldDecrement,
} from 'reka-ui'
import { Icon } from '@iconify/vue'
import { watch } from 'vue'
import { ICONS } from '@/logic/constants/icons'

const props = withDefaults(
  defineProps<{
    size?: 'small' | 'medium'
    step?: number
    min?: number
    max?: number
    disabled?: boolean
  }>(),
  {
    size: 'medium',
    step: 1,
    min: undefined,
    max: undefined,
    disabled: false,
  },
)

const modelValue = defineModel<number | null>('value')

/** blur 时强制钳制 safeValue，兜底 Reka 未覆盖的边角情况 */
const handleFocusout = () => {
  safeValue.value = clamp(safeValue.value)
}

/** 钳制到 [min, max] 范围，null/NaN 复位为 min */
const clamp = (val: number | null | undefined): number => {
  if (val == null || (typeof val === 'number' && isNaN(val))) {
    return props.min ?? 0
  }
  if (props.min != null && val < props.min) return props.min
  if (props.max != null && val > props.max) return props.max
  return val
}

/**
 * safeValue — Reka 与父组件之间的隔离层。
 * Reka 的 applyInputValue 会在清空时设 undefined，
 * 通过 safeValue 拦截 → 钳制后写入 modelValue，
 * 避免 undefined 泄露到父组件触发 Vue prop type check 警告。
 */
const safeValue = ref<number | undefined>(modelValue.value ?? undefined)

watch(modelValue, (val) => {
  safeValue.value = val ?? undefined
})

watch(safeValue, (val) => {
  modelValue.value = clamp(val)
})
</script>

<template>
  <div @focusout="handleFocusout">
    <NumberFieldRoot
      v-model="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      class="reka-number-field"
      :class="{ 'reka-number-field--small': size === 'small' }"
    >
      <NumberFieldInput class="reka-number-field__input" />
      <slot name="suffix" />
      <NumberFieldIncrement class="reka-number-field__btn reka-focus-visible">
        <Icon :icon="ICONS.countdownSpinUp" />
      </NumberFieldIncrement>
      <NumberFieldDecrement class="reka-number-field__btn reka-focus-visible">
        <Icon :icon="ICONS.countdownSpinDown" />
      </NumberFieldDecrement>
    </NumberFieldRoot>
  </div>
</template>
