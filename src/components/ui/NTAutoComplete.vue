<script setup lang="ts">
/**
 * NTAutoComplete — NaiveTab 自动完成组件
 *
 * 基于 Reka UI Combobox 原语封装。对标 Naive UI NAutoComplete API。
 * 支持服务端搜索过滤（ignoreFilter）、加载状态、选项选择回调。
 *
 * @example
 * <NTAutoComplete
 *   v-model:value="keyword"
 *   :options="list"
 *   :loading="isLoading"
 *   @select="onSelect"
 * />
 */
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import {
  ComboboxRoot,
  ComboboxInput,
  ComboboxAnchor,
  ComboboxContent,
  ComboboxViewport,
  ComboboxItem,
  ComboboxEmpty,
} from 'reka-ui'
import { ICONS } from '@/logic/constants/icons'

interface Option {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    /** 下拉选项 */
    options?: Option[]
    /** 加载中 */
    loading?: boolean
    /** 禁用 */
    disabled?: boolean
    /** 尺寸 */
    size?: 'small' | 'medium'
    /** placeholder */
    placeholder?: string
  }>(),
  {
    options: () => [],
    loading: false,
    disabled: false,
    size: 'medium',
    placeholder: undefined,
  },
)

const keyword = defineModel<string>('value', { required: true })

const emit = defineEmits<{
  /** 选中选项时触发，传递选项的 value */
  select: [value: string]
}>()

/** ComboboxRoot 的选中值（内部使用，不暴露给父级） */
const selected = ref<string>('')

/** 根据选中值查找 label，供 displayValue 使用 */
const getLabel = (val: string): string => {
  if (!val) return keyword.value
  return props.options.find((o) => o.value === val)?.label ?? keyword.value
}

/** 选项选中处理 */
const handleSelect = (value: string) => {
  // 立即关闭下拉，通过 updateSelected 会触发 keyword 更新
  const opt = props.options.find((o) => o.value === value)
  if (opt) {
    keyword.value = opt.label
  }
  selected.value = value
  emit('select', value)
}
</script>

<template>
  <ComboboxRoot
    v-model="selected"
    :ignore-filter="true"
    :disabled="disabled"
    class="reka-autocomplete"
    :class="{ 'reka-autocomplete--small': size === 'small' }"
  >
    <ComboboxAnchor class="reka-autocomplete__anchor">
      <ComboboxInput
        v-model="keyword"
        :display-value="getLabel"
        :placeholder="placeholder"
        class="reka-autocomplete__input reka-focus-visible"
      />
      <!-- 加载中旋转图标 -->
      <Icon
        v-if="loading"
        :icon="ICONS.loading"
        class="reka-autocomplete__loading-icon"
      />
    </ComboboxAnchor>

    <ComboboxContent
      class="reka-autocomplete__content"
      position="popper"
      :side-offset="4"
      align="start"
    >
      <ComboboxViewport class="reka-autocomplete__viewport">
        <ComboboxEmpty
          v-if="!loading && !options.length"
          class="reka-autocomplete__empty"
        >
          <slot name="empty">无匹配结果</slot>
        </ComboboxEmpty>

        <ComboboxItem
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
          class="reka-autocomplete__item"
          @select="handleSelect(opt.value)"
        >
          <slot
            name="item"
            :option="opt"
          >
            <span class="reka-autocomplete__item-label">{{ opt.label }}</span>
          </slot>
        </ComboboxItem>
      </ComboboxViewport>
    </ComboboxContent>
  </ComboboxRoot>
</template>
