<script setup lang="ts">
import { globalState } from '@/logic/store/state'
import { ICONS } from '@/logic/constants/icons'
import { SettingHeaderBar, SettingCollapseSection } from '@/setting/components'
import AnalogSetting from './AnalogSetting.vue'
import DigitalSetting from './DigitalSetting.vue'
import FlipSetting from './FlipSetting.vue'
import NeonSetting from './NeonSetting.vue'
import DateSetting from './DateSetting.vue'

/**
 * clockDate 是一个聚合面板：通过 SettingCollapseSection 收纳了 5 个子时钟/日期设置组件
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
const expandedNames = ref<string[]>([])

const handleExpanded = (name: string, isExpanded: boolean) => {
  if (isExpanded) {
    if (!expandedNames.value.includes(name)) {
      expandedNames.value.push(name)
    }
  } else {
    expandedNames.value = expandedNames.value.filter((n) => n !== name)
  }
}

watch(
  () => globalState.currSettingAnchor,
  (anchor) => {
    if (!anchor || !ALL_SECTIONS.includes(anchor)) {
      return
    }
    // 只展开目标 section，其余全部折叠
    expandedNames.value = [anchor]
    globalState.currSettingAnchor = ''
  },
  { immediate: true },
)
</script>

<template>
  <SettingHeaderBar :title="$t('setting.clockDate')" />

  <div class="setting__pane-content">
    <SettingCollapseSection
      name="clockDigital"
      :title="$t('setting.clockDigital')"
      :icon="ICONS.clockDigital"
      :expanded="expandedNames.includes('clockDigital')"
      @update:expanded="handleExpanded"
    >
      <DigitalSetting />
    </SettingCollapseSection>

    <SettingCollapseSection
      name="clockAnalog"
      :title="$t('setting.clockAnalog')"
      :icon="ICONS.clockAnalog"
      :expanded="expandedNames.includes('clockAnalog')"
      @update:expanded="handleExpanded"
    >
      <AnalogSetting />
    </SettingCollapseSection>

    <SettingCollapseSection
      name="clockFlip"
      :title="$t('setting.clockFlip')"
      :icon="ICONS.clockFlip"
      :expanded="expandedNames.includes('clockFlip')"
      @update:expanded="handleExpanded"
    >
      <FlipSetting />
    </SettingCollapseSection>

    <SettingCollapseSection
      name="clockNeon"
      :title="$t('setting.clockNeon')"
      :icon="ICONS.clockNeon"
      :expanded="expandedNames.includes('clockNeon')"
      @update:expanded="handleExpanded"
    >
      <NeonSetting />
    </SettingCollapseSection>

    <SettingCollapseSection
      name="date"
      :title="$t('setting.date')"
      :icon="ICONS.date"
      :expanded="expandedNames.includes('date')"
      @update:expanded="handleExpanded"
    >
      <DateSetting />
    </SettingCollapseSection>
  </div>
</template>
