<script setup lang="ts">
/**
 * NTSelect — NaiveTab 选择器组件
 *
 * 基于 Reka UI Select 原语封装。对标 Naive UI NSelect API：
 * options 通过 prop 传入，内部渲染 NTSelectItem。
 * 如需自定义选项渲染，用默认插槽替代 options prop。
 *
 * @example
 * <NTSelect v-model:value="val" :options="list" size="small" />
 * <NTSelect v-model:value="val" placeholder="请选择">
 *   <NTSelectItem v-for="o in list" :key="o.value" :value="o.value">
 *     {{ o.label }}
 *   </NTSelectItem>
 * </NTSelect>
 */
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
} from 'reka-ui'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { ICONS } from '@/logic/constants/icons'
import NTSelectItem from './NTSelectItem.vue'

interface Option {
  label: string
  value: string | number
  disabled?: boolean
  [key: string]: any
}

const props = withDefaults(
  defineProps<{
    options?: Option[]
    placeholder?: string
    size?: 'small' | 'medium'
    disabled?: boolean
  }>(),
  {
    options: () => [],
    placeholder: undefined,
    size: 'medium',
    disabled: false,
  },
)

const modelValue = defineModel<any>('value')

/** 当前选中的 option 对象，供 #label 插槽使用 */
const selectedOption = computed(() => {
  if (modelValue.value == null) return null
  return props.options?.find((o) => o.value === modelValue.value) || null
})
</script>

<template>
  <SelectRoot
    v-model="modelValue"
    :disabled="disabled"
  >
    <SelectTrigger
      class="reka-select__trigger reka-focus-visible"
      :class="{ 'reka-select__trigger--small': size === 'small' }"
    >
      <slot
        name="label"
        :option="selectedOption"
        :value="modelValue"
        :placeholder="placeholder"
      >
        <SelectValue
          :placeholder="placeholder"
          class="reka-select__value"
        />
      </slot>
      <SelectIcon class="reka-select__icon">
        <Icon :icon="ICONS.chevronRight" />
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        class="reka-select__content"
        :side-offset="4"
        position="popper"
      >
        <slot>
          <NTSelectItem
            v-for="item in options"
            :key="item.value"
            :value="item.value"
            :disabled="item.disabled"
          >
            {{ item.label }}
          </NTSelectItem>
        </slot>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
