<script setup lang="ts">
/**
 * NTAccordion — NaiveTab 手风琴组件
 *
 * 基于 Reka UI Accordion 封装。默认单展开模式（同一时间只有一个面板打开），
 * 点击已展开的面板可再次点击关闭（collapsible）。
 *
 * 通过 `items` prop 定义面板列表（含标题、图标、内容组件）。
 * 如需自定义渲染，可用命名 slot（value 为名）覆盖 content。
 *
 * @example
 * const sections = [
 *   { value: 'weather', title: '天气', icon: ICONS.temp, content: WeatherSetting },
 * ]
 * <NTAccordion v-model="openSection" :items="sections" />
 */
import type { Component } from 'vue'
import { Icon } from '@iconify/vue'
import {
  AccordionRoot,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
} from 'reka-ui'
import { ICONS } from '@/logic/constants/icons'

export interface AccordionItemDef {
  /** 唯一标识，也用作 slot 名 */
  value: string
  /** 标题文字 */
  title: string
  /** 标题前图标，通过 ICONS 常量引用 */
  icon?: string
  /** 面板内容组件（默认渲染），命名 slot 可覆盖 */
  content?: Component
}

defineProps<{
  /** 面板定义列表 */
  items: AccordionItemDef[]
  /** 禁用手风琴及所有子项 */
  disabled?: boolean
}>()

const modelValue = defineModel<string>({ default: '' })

/**
 * Reka UI AccordionRoot 在 type="single" collapsible 模式下，所有面板折叠时
 * v-model 值为 `undefined`。为防止 undefined 泄露到父组件（触发 Vue prop 类型校验警告），
 * 通过 computed 桥接：对外保持 string 语义（空字符串表示无展开项），对内转换 undefined。
 */
const innerValue = computed<string | undefined>({
  get: () => modelValue.value || undefined,
  set: (val) => {
    modelValue.value = val ?? ''
  },
})
</script>

<template>
  <AccordionRoot
    v-model="innerValue"
    type="single"
    collapsible
    :disabled="disabled"
    class="reka-accordion"
  >
    <AccordionItem
      v-for="item in items"
      :key="item.value"
      :value="item.value"
      class="reka-accordion__item"
    >
      <AccordionHeader class="reka-accordion__header">
        <AccordionTrigger class="reka-accordion__trigger reka-focus-visible">
          <div class="reka-accordion__trigger-title">
            <Icon
              v-if="item.icon"
              :icon="item.icon"
              class="reka-accordion__trigger-icon"
            />
            <span class="reka-accordion__trigger-label">
              {{ item.title }}
            </span>
          </div>

          <div class="reka-accordion__trigger-indicator">
            <Icon
              :icon="ICONS.chevronRight"
              class="reka-accordion__chevron"
            />
          </div>
        </AccordionTrigger>
      </AccordionHeader>

      <AccordionContent class="reka-accordion__content">
        <div class="reka-accordion__body">
          <slot :name="item.value">
            <component :is="item.content" />
          </slot>
        </div>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
