<script setup lang="ts">
/**
 * NTDropdown — NaiveTab 下拉菜单组件
 *
 * 基于 Reka UI DropdownMenu 原语封装，对标 Naive UI NDropdown API。
 * 支持 :options prop（简单模式）和默认插槽（自定义选项）。
 *
 * @example
 * <NTDropdown :options="list" @select="handleSelect">
 *   <button>打开菜单</button>
 * </NTDropdown>
 */
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuArrow,
} from 'reka-ui'
interface DropdownOption {
  key: string
  label: () => any
  icon?: () => any
}

withDefaults(
  defineProps<{
    options?: DropdownOption[]
    placement?: 'top' | 'bottom' | 'left' | 'right'
    disabled?: boolean
  }>(),
  {
    options: () => [],
    placement: undefined,
    disabled: false,
  },
)

const emit = defineEmits<{
  select: [key: string]
}>()
</script>

<template>
  <DropdownMenuRoot :disabled="disabled">
    <DropdownMenuTrigger as-child>
      <slot />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="reka-dropdown__content"
        :side-offset="4"
      >
        <DropdownMenuArrow class="reka-dropdown__arrow" />
        <slot name="items">
          <DropdownMenuItem
            v-for="item in options"
            :key="item.key"
            class="reka-dropdown__item reka-focus-visible"
            @select="emit('select', item.key)"
          >
            <component
              :is="item.icon"
              v-if="item.icon"
              class="reka-dropdown__item-icon"
            />
            <component :is="item.label" />
          </DropdownMenuItem>
        </slot>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
