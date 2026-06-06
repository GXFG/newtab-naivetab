<script setup lang="ts">
/**
 * SelectFont — 字体选择器（业务组件）
 *
 * 封装 NTSelect + availableFontOptions + 字体预览（label + abc-ABC-123 示例）。
 * 供 FontField / KeyboardKeycapSetting / KeyboardNameplateSetting 共用。
 *
 * @example
 * <SelectFont v-model:value="fontFamily" size="small" />
 */
import NTSelect from '@/components/ui/NTSelect.vue'
import NTSelectItem from '@/components/ui/NTSelectItem.vue'
import { availableFontOptions } from '@/logic/store/style'

defineProps<{
  size?: 'small' | 'medium'
  disabled?: boolean
}>()

const modelValue = defineModel<string>('value')
</script>

<template>
  <NTSelect
    v-model:value="modelValue"
    :options="availableFontOptions"
    :size="size"
    :disabled="disabled"
  >
    <template #label="{ option, placeholder }">
      <template v-if="option">
        <span class="reka-select__label-row reka-select__label-row--between">
          <span class="reka-select__value">{{ option.label }}</span>
          <span
            class="reka-select__preview"
            :style="{ fontFamily: option.label }"
            >abc-ABC-123</span
          >
        </span>
      </template>
      <span
        v-else
        class="reka-select__value reka-select__value--placeholder"
        >{{ placeholder }}</span
      >
    </template>
    <NTSelectItem
      v-for="item in availableFontOptions"
      :key="item.value"
      :value="item.value"
    >
      <span class="reka-select__label-row reka-select__label-row--between">
        <span>{{ item.label }}</span>
        <span
          class="reka-select__preview"
          :style="{ fontFamily: item.label }"
          >abc-ABC-123</span
        >
      </span>
    </NTSelectItem>
  </NTSelect>
</template>
