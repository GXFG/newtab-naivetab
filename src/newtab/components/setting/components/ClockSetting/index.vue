<script setup lang="ts">
import AnalogSetting from './AnalogSetting.vue'
import DigitalSetting from './DigitalSetting.vue'
</script>

<template>
  <NCollapse class="setting__content" display-directive="show" :default-expanded-names="['clockAnalog', 'clockDigital']">
    <NCollapseItem :title="$t('setting.clockDigital')" name="clockDigital">
      <DigitalSetting />
    </NCollapseItem>
    <NCollapseItem :title="$t('setting.clockAnalog')" name="clockAnalog">
      <AnalogSetting />
    </NCollapseItem>
  </NCollapse>
</template>
