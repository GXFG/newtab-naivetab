<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import SettingPaneTitle from '@/newtab/setting/components/SettingPaneTitle.vue'
import AnalogSetting from './AnalogSetting.vue'
import DigitalSetting from './DigitalSetting.vue'
import DateSetting from './DateSetting.vue'
</script>

<template>
  <SettingPaneTitle :title="`${$t('setting.clock')} / ${$t('setting.date')}`" />

  <p class="setting__label">
    <Icon
      :icon="ICONS.clockDigital"
      class="label__icon"
    />
    {{ $t('setting.clockDigital') }}
  </p>
  <DigitalSetting />

  <p class="setting__label">
    <Icon
      :icon="ICONS.clockAnalog"
      class="label__icon"
    />
    {{ $t('setting.clockAnalog') }}
  </p>
  <AnalogSetting />

  <p class="setting__label">
    <Icon
      :icon="ICONS.date"
      class="label__icon"
    />
    {{ $t('setting.date') }}
  </p>
  <DateSetting />
</template>
