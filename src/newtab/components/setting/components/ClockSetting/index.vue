<script setup lang="ts">
import AnalogSetting from './AnalogSetting.vue'
import DigitalSetting from './DigitalSetting.vue'
import DateSetting from './DateSetting.vue'
</script>

<template>
  <NCollapse
    display-directive="show"
    :default-expanded-names="['clockAnalog', 'clockDigital', 'date']"
  >
    <NCollapseItem
      :title="$t('setting.clockDigital')"
      name="clockDigital"
      style="padding-top: 13px"
    >
      <DigitalSetting />
    </NCollapseItem>

    <NCollapseItem
      :title="$t('setting.clockAnalog')"
      name="clockAnalog"
    >
      <AnalogSetting />
    </NCollapseItem>

    <NCollapseItem
      :title="$t('setting.date')"
      name="date"
    >
      <DateSetting />
    </NCollapseItem>
  </NCollapse>
</template>
