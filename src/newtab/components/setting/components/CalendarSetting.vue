<script setup lang="ts">
import { swatcheColors } from '@/styles/const'
import { localConfig, localState } from '@/logic'

const beginsList = computed(() => [
  { label: window.$t('calendar.monday'), value: 1 },
  { label: window.$t('calendar.sunday'), value: 7 },
])
</script>

<template>
  <BaseComponentSetting cname="calendar">
    <template #header>
      <NFormItem :label="$t('calendar.weekBeginsOn')">
        <NSelect v-model:value="localConfig.calendar.weekBeginsOn" :options="beginsList" />
      </NFormItem>
    </template>

    <template #color>
      <NFormItem :label="`${$t('calendar.holiday')}${$t('common.fontColor')}`">
        <NColorPicker v-model:value="localConfig.calendar.holidayFontColor[localState.currAppearanceCode]" show-preview :swatches="swatcheColors" />
      </NFormItem>

      <p class="setting__label">
        {{ $t('calendar.restDesc') }}
      </p>
      <NFormItem :label="`${$t('common.backgroundColor')}`">
        <NColorPicker
          v-model:value="localConfig.calendar.restItemBackgroundColor[localState.currAppearanceCode]"
          show-preview
          :swatches="swatcheColors"
        />
      </NFormItem>
      <NFormItem :label="`${$t('common.label')}${$t('common.fontColor')}`">
        <NColorPicker v-model:value="localConfig.calendar.restLabelFontColor[localState.currAppearanceCode]" show-preview :swatches="swatcheColors" />
      </NFormItem>
      <NFormItem :label="`${$t('common.label')}${$t('common.backgroundColor')}`">
        <NColorPicker
          v-model:value="localConfig.calendar.restLabelBackgroundColor[localState.currAppearanceCode]"
          show-preview
          :swatches="swatcheColors"
        />
      </NFormItem>

      <p class="setting__label">
        {{ $t('calendar.workDesc') }}
      </p>
      <NFormItem :label="`${$t('common.backgroundColor')}`">
        <NColorPicker
          v-model:value="localConfig.calendar.workItemBackgroundColor[localState.currAppearanceCode]"
          show-preview
          :swatches="swatcheColors"
        />
      </NFormItem>
      <NFormItem :label="`${$t('common.label')}${$t('common.fontColor')}`">
        <NColorPicker v-model:value="localConfig.calendar.workLabelFontColor[localState.currAppearanceCode]" show-preview :swatches="swatcheColors" />
      </NFormItem>
      <NFormItem :label="`${$t('common.label')}${$t('common.backgroundColor')}`">
        <NColorPicker
          v-model:value="localConfig.calendar.workLabelBackgroundColor[localState.currAppearanceCode]"
          show-preview
          :swatches="swatcheColors"
        />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
