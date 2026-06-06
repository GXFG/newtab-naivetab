<script setup lang="ts">
/**
 * NTRadio — NaiveTab 单选按钮组件
 *
 * 基于 Reka UI RadioGroupItem 二次封装，必须在 NTRadioGroup 内使用。
 * 样式由 src/styles/reka/radio.css 中的 .reka-radio 系列类控制。
 *
 * 视觉结构（对标 Radix Themes 伪元素双环）：
 *   .reka-radio__circle          → 外圈（border + inset shadow）
 *   .reka-radio__circle::after   → 内点（40% 尺寸，弹簧缩放入场）
 *
 * @example
 * <NTRadio value="option-a">选项 A</NTRadio>
 * <NTRadio value="option-b" disabled>选项 B</NTRadio>
 */
import { RadioGroupItem } from 'reka-ui'

defineProps<{
  value: any
  disabled?: boolean
}>()
</script>

<template>
  <RadioGroupItem
    :value="value"
    :disabled="disabled"
    class="reka-radio reka-focus-visible"
  >
    <span
      class="reka-radio__circle"
      aria-hidden="true"
    />
    <span class="reka-radio__label">
      <slot />
    </span>
  </RadioGroupItem>
</template>
