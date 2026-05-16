<script setup lang="ts">
import { computed } from 'vue'
import { localConfig } from '@/logic/config/state'
import { SettingFormWrap, SettingFormSection } from '@/setting/components'
import { NumberField, SwitchField, FontField } from '@/setting/fields'

const showNumberScale = computed(() => localConfig.clockAnalog.showNumberScale)
</script>

<template>
  <SettingFormWrap widget-code="clockAnalog">
    <!-- 功能配置 -->
    <SettingFormSection section-key="common.behavior">
      <NumberField
        v-model="localConfig.clockAnalog.width"
        :label="$t('common.width')"
        :min="10"
        :max="1000"
        :step="1"
        show-slider
      />

      <SwitchField
        v-model="localConfig.clockAnalog.showNumberScale"
        :label="$t('clock.showNumberScale')"
      />

      <Transition name="setting-slide">
        <div
          v-if="showNumberScale"
          class="number-scale-group"
        >
          <NumberField
            v-model="localConfig.clockAnalog.numberScaleRadius"
            :label="$t('clock.numberScaleRadius')"
            :min="50"
            :max="95"
            :step="1"
            show-slider
          />

          <FontField
            v-model:font-family="localConfig.clockAnalog.numberScaleFontFamily"
            v-model:font-color="localConfig.clockAnalog.numberScaleFontColor"
            v-model:font-size="localConfig.clockAnalog.numberScaleFontSize"
            :label="$t('clock.numberScaleFont')"
          />
        </div>
      </Transition>
    </SettingFormSection>
  </SettingFormWrap>
</template>
