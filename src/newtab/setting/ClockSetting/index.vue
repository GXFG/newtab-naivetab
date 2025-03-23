<script setup lang="ts">
import BaseComponentCardTitle from '@/newtab/components/form/BaseComponentCardTitle.vue'
import AnalogSetting from './AnalogSetting.vue'
import DigitalSetting from './DigitalSetting.vue'
import DateSetting from './DateSetting.vue'
</script>

<template>
  <BaseComponentCardTitle :title="`${$t('setting.clock')}/${$t('setting.date')}`" />

  <p
    class="setting__label"
    style="margin-top: 13px;"
  >
    {{ $t('setting.clockDigital') }}
  </p>
  <DigitalSetting />

  <p class="setting__label">{{ $t('setting.clockAnalog') }}</p>
  <AnalogSetting />

  <p class="setting__label">{{ $t('setting.date') }}</p>
  <DateSetting />
</template>
