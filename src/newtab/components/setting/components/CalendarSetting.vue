<script setup lang="ts">
import { localConfig, localState } from '@/logic/store'

const beginsList = computed(() => [
  { label: window.$t('calendar.monday'), value: 1 },
  { label: window.$t('calendar.sunday'), value: 7 },
])
</script>

<template>
  <BaseComponentSetting cname="calendar">
    <template #header>
      <NFormItem :label="$t('calendar.weekBeginsOn')">
        <NRadioGroup v-model:value="localConfig.calendar.weekBeginsOn">
          <NRadioButton
            v-for="item in beginsList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadioButton>
        </NRadioGroup>
      </NFormItem>
    </template>

    <template #color>
      <NFormItem :label="`${$t('calendar.holiday')}${$t('common.fontColor')}`">
        <CustomColorPicker v-model:value="localConfig.calendar.holidayFontColor[localState.currAppearanceCode]" />
      </NFormItem>

      <p class="setting__label">
        {{ $t('calendar.restDesc') }}
      </p>
      <div class="color-form__wrap">
        <NFormItem :label="`${$t('common.fontColor')}`">
          <CustomColorPicker v-model:value="localConfig.calendar.restFontColor[localState.currAppearanceCode]" />
        </NFormItem>

        <NFormItem :label="`${$t('common.backgroundColor')}`">
          <CustomColorPicker v-model:value="localConfig.calendar.restItemBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>
      <div class="color-form__wrap">
        <NFormItem :label="`${$t('common.label')}${$t('common.fontColor')}`">
          <CustomColorPicker v-model:value="localConfig.calendar.restLabelFontColor[localState.currAppearanceCode]" />
        </NFormItem>

        <NFormItem :label="`${$t('common.label')}${$t('common.backgroundColor')}`">
          <CustomColorPicker v-model:value="localConfig.calendar.restLabelBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>

      <p class="setting__label">
        {{ $t('calendar.workDesc') }}
      </p>
      <div class="color-form__wrap">
        <NFormItem :label="`${$t('common.fontColor')}`">
          <CustomColorPicker v-model:value="localConfig.calendar.workFontColor[localState.currAppearanceCode]" />
        </NFormItem>

        <NFormItem :label="`${$t('common.backgroundColor')}`">
          <CustomColorPicker v-model:value="localConfig.calendar.workItemBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>

      <div class="color-form__wrap">
        <NFormItem :label="`${$t('common.label')}${$t('common.fontColor')}`">
          <CustomColorPicker v-model:value="localConfig.calendar.workLabelFontColor[localState.currAppearanceCode]" />
        </NFormItem>

        <NFormItem :label="`${$t('common.label')}${$t('common.backgroundColor')}`">
          <CustomColorPicker v-model:value="localConfig.calendar.workLabelBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>
    </template>
  </BaseComponentSetting>
</template>
