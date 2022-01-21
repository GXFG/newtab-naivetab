<template>
  <NCollapse class="setting__content" display-directive="show" :default-expanded-names="['clockAnalog', 'clockDigital']">
    <!-- clockAnalog -->
    <NCollapseItem :title="$t('setting.clockAnalog')" name="clockAnalog">
      <BaseComponentSetting cname="clockAnalog">
        <template #header>
          <NFormItem :label="$t('common.theme')">
            <NSelect v-model:value="globalState.setting.clockAnalog.theme" :options="ANALOG_CLOCK_THEME" />
          </NFormItem>
        </template>
      </BaseComponentSetting>
    </NCollapseItem>
    <!-- clockDigital -->
    <NCollapseItem :title="$t('setting.clockDigital')" name="clockDigital">
      <BaseComponentSetting cname="clockDigital">
        <template #header>
          <NFormItem :label="$t('common.format')">
            <NInput v-model:value="globalState.setting.clockDigital.format" />
            <Tips link :content="URL_DAYJS_FORMAT" />
          </NFormItem>
          <NFormItem :label="$t('clock.apMark')">
            <NSwitch v-model:value="globalState.setting.clockDigital.unitEnabled" />
            <NSlider v-if="globalState.setting.clockDigital.unitEnabled" v-model:value="globalState.style.clockDigital.unit.fontSize" class="setting__row-element" :step="1" :min="12" :max="200" />
            <NInputNumber v-if="globalState.setting.clockDigital.unitEnabled" v-model:value="globalState.style.clockDigital.unit.fontSize" class="setting__input-number" :min="12" :step="1" />
          </NFormItem>
        </template>
      </BaseComponentSetting>
    </NCollapseItem>
  </NCollapse>
</template>

<script setup lang="ts">
import { ANALOG_CLOCK_THEME, URL_DAYJS_FORMAT, globalState } from '@/logic'
</script>
