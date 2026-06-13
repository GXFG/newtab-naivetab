<script setup lang="ts">
import { globalState } from '@/logic/store/state'
import { ICONS } from '@/logic/constants/icons'
import NTAccordion from '@/components/ui/NTAccordion.vue'
import type { AccordionItemDef } from '@/components/ui/NTAccordion.vue'
import AnalogSetting from './AnalogSetting.vue'
import DigitalSetting from './DigitalSetting.vue'
import FlipSetting from './FlipSetting.vue'
import NeonSetting from './NeonSetting.vue'
import DateSetting from './DateSetting.vue'

/**
 * clockDate 是一个聚合面板：通过 NTAccordion 收纳了 5 个子时钟/日期设置组件
 *（DigitalSetting、AnalogSetting、FlipSetting、NeonSetting、DateSetting）。
 * 每个子组件各自使用 SettingFormWrap + 独立的 widgetCode，拥有独立的重置按钮。
 * 因此本文件不包裹 SettingFormWrap，避免重复的容器和冗余的重置入口。
 */
const ALL_SECTIONS = [
  'clockDigital',
  'clockAnalog',
  'clockFlip',
  'clockNeon',
  'date',
]
const accordionItems: AccordionItemDef[] = [
  {
    value: 'clockDigital',
    title: window.$t('setting.clockDigital'),
    icon: ICONS.clockDigital,
    content: DigitalSetting,
  },
  {
    value: 'clockAnalog',
    title: window.$t('setting.clockAnalog'),
    icon: ICONS.clockAnalog,
    content: AnalogSetting,
  },
  {
    value: 'clockFlip',
    title: window.$t('setting.clockFlip'),
    icon: ICONS.clockFlip,
    content: FlipSetting,
  },
  {
    value: 'clockNeon',
    title: window.$t('setting.clockNeon'),
    icon: ICONS.clockNeon,
    content: NeonSetting,
  },
  {
    value: 'date',
    title: window.$t('setting.date'),
    icon: ICONS.date,
    content: DateSetting,
  },
]
const expandedName = ref('')

watch(
  () => globalState.currSettingAnchor,
  (anchor) => {
    if (!anchor || !ALL_SECTIONS.includes(anchor)) {
      return
    }
    expandedName.value = anchor
    globalState.currSettingAnchor = ''
  },
  { immediate: true },
)
</script>

<template>
  <div class="setting__pane-content">
    <NTAccordion
      v-model="expandedName"
      :items="accordionItems"
    />
  </div>
</template>
