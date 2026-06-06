<script setup lang="ts">
/**
 * NTRadioGroup — NaiveTab 单选组组件
 *
 * 基于 Reka UI RadioGroupRoot 二次封装。
 * 通过 orientation 控制水平/垂直排列，disabled 统一禁用整组。
 * NTRadio 必须作为其直接子组件使用。
 *
 * @example
 * <NTRadioGroup v-model:value="selected" direction="horizontal">
 *   <NTRadio value="a">选项 A</NTRadio>
 *   <NTRadio value="b">选项 B</NTRadio>
 * </NTRadioGroup>
 */
import { RadioGroupRoot } from 'reka-ui'

defineProps<{
  disabled?: boolean
  direction?: 'horizontal' | 'vertical'
}>()

const modelValue = defineModel<any>('value', { required: true })
</script>

<template>
  <RadioGroupRoot
    v-model="modelValue"
    :disabled="disabled"
    :orientation="direction === 'vertical' ? 'vertical' : 'horizontal'"
    class="reka-radio-group"
  >
    <slot />
  </RadioGroupRoot>
</template>
