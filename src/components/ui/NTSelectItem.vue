<script setup lang="ts">
/**
 * NTSelectItem — NaiveTab 选择器选项
 *
 * 必须放在 NTSelect 内部使用。通过 value prop 标识选项值，
 * 默认插槽为选项的显示文本。
 *
 * @example
 * <NTSelectItem value="a">选项 A</NTSelectItem>
 */
import { SelectItem, SelectItemText, SelectItemIndicator } from 'reka-ui'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'

defineProps<{
  value: string | number
  disabled?: boolean
}>()
</script>

<template>
  <SelectItem
    :value="value"
    :disabled="disabled"
    class="reka-select__item reka-focus-visible"
  >
    <SelectItemText class="reka-select__item-text">
      <slot />
    </SelectItemText>
    <!-- 固定宽度占位，Indicator Presence mount/unmount 不会推挤文字 -->
    <span class="reka-select__indicator">
      <SelectItemIndicator>
        <Icon :icon="ICONS.check" />
      </SelectItemIndicator>
    </span>
  </SelectItem>
</template>
