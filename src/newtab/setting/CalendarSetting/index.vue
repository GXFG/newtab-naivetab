<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { localConfig, localState, availableFontOptions, fontSelectRenderLabel } from '@/logic/store'
import SettingPaneTitle from '@/newtab/setting/components/SettingPaneTitle.vue'
import SettingPaneWrap from '@/newtab/setting/components/SettingPaneWrap.vue'
import CustomColorPicker from '@/newtab/setting/components/CustomColorPicker.vue'

const beginsList = computed(() => [
  { label: window.$t('calendar.monday'), value: 1 },
  { label: window.$t('calendar.sunday'), value: 7 },
])
</script>

<template>
  <SettingPaneTitle :title="$t('setting.calendar')" />

  <SettingPaneWrap widget-code="calendar">
    <template #header>
      <NFormItem :label="$t('calendar.weekBeginsOn')">
        <NRadioGroup
          v-model:value="localConfig.calendar.weekBeginsOn"
          size="small"
        >
          <NRadioButton
            v-for="item in beginsList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadioButton>
        </NRadioGroup>
      </NFormItem>

      <NFormItem :label="$t('calendar.festivalCountdown')">
        <NSwitch
          v-model:value="localConfig.calendar.festivalCountdown"
          size="small"
        />
      </NFormItem>
    </template>

    <template #color>
      <NFormItem :label="`${$t('calendar.day')}${$t('common.font')}`">
        <NSelect
          v-model:value="localConfig.calendar.dayFontFamily"
          :options="availableFontOptions"
          :render-label="fontSelectRenderLabel"
          size="small"
        />
        <CustomColorPicker
          v-model:value="localConfig.calendar.dayFontColor[localState.currAppearanceCode]"
          class="setting__item-ele"
        />
        <NInputNumber
          v-model:value="localConfig.calendar.dayFontSize"
          class="setting__item-ele setting__input-number"
          size="small"
          :step="1"
          :min="5"
          :max="50"
        />
      </NFormItem>

      <NFormItem :label="`${$t('calendar.desc')}${$t('common.font')}`">
        <NSelect
          v-model:value="localConfig.calendar.descFontFamily"
          :options="availableFontOptions"
          :render-label="fontSelectRenderLabel"
          size="small"
        />
        <CustomColorPicker
          v-model:value="localConfig.calendar.descFontColor[localState.currAppearanceCode]"
          class="setting__item-ele"
        />
        <NInputNumber
          v-model:value="localConfig.calendar.descFontSize"
          class="setting__item-ele setting__input-number"
          size="small"
          :step="1"
          :min="5"
          :max="50"
        />
      </NFormItem>

      <p class="setting__label">
        <Icon
          :icon="ICONS.calendarHoliday"
          class="label__icon"
        />
        {{ $t('calendar.holiday') }}
      </p>
      <div class="setting__form_wrap">
        <NFormItem
          :label="`${$t('calendar.desc')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.holidayFontColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>

      <p class="setting__label">
        <Icon
          :icon="ICONS.calendarToday"
          class="label__icon"
        />
        {{ $t('calendar.todayDesc') }}
      </p>
      <div class="setting__form_wrap">
        <NFormItem
          :label="`${$t('common.label')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.todayLabelFontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('common.label')}${$t('common.backgroundColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.todayLabelBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>
      <div class="setting__form_wrap">
        <NFormItem
          :label="`${$t('calendar.day')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.todayDayFontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('calendar.desc')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.todayDescFontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('common.backgroundColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.todayItemBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>

      <p class="setting__label">
        <Icon
          :icon="ICONS.calendarRest"
          class="label__icon"
        />
        {{ $t('calendar.restDesc') }}
      </p>
      <div class="setting__form_wrap">
        <NFormItem
          :label="`${$t('common.label')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.restLabelFontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('common.label')}${$t('common.backgroundColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.restLabelBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>
      <div class="setting__form_wrap">
        <NFormItem
          :label="`${$t('calendar.day')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.restDayFontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('calendar.desc')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.restDescFontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('common.backgroundColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.restItemBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>

      <p class="setting__label">
        <Icon
          :icon="ICONS.calendarWork"
          class="label__icon"
        />
        {{ $t('calendar.workDesc') }}
      </p>
      <div class="setting__form_wrap">
        <NFormItem
          :label="`${$t('common.label')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.workLabelFontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('common.label')}${$t('common.backgroundColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.workLabelBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>
      <div class="setting__form_wrap">
        <NFormItem
          :label="`${$t('calendar.day')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.workDayFontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('calendar.desc')}${$t('common.fontColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.workDescFontColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('common.backgroundColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.calendar.workItemBackgroundColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>
    </template>
  </SettingPaneWrap>
</template>
