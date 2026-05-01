<script setup lang="ts">
import { localConfig } from '@/logic/store'
import { ICONS } from '@/logic/icons'
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormItem,
  SettingFormInlineRow,
  SettingFormSection,
} from '@/setting/components'
import {
  NumberField,
  SwitchField,
  ColorField,
  FontField,
  ToggleColorField,
} from '@/setting/fields'

const beginsList = computed(() => [
  { label: window.$t('calendar.weekday.monday'), value: 1 },
  { label: window.$t('calendar.weekday.sunday'), value: 7 },
])
</script>

<template>
  <SettingHeaderBar :title="$t('setting.calendar')" />

  <SettingFormWrap widget-code="calendar">
    <!-- 日历配置 -->
    <SettingFormSection
      :title="$t('calendar.sectionConfig')"
      :icon="ICONS.settings"
    >
      <SettingFormItem :label="$t('calendar.weekBeginsOn')">
        <NRadioGroup
          v-model:value="localConfig.calendar.weekBeginsOn"
          size="small"
          direction="horizontal"
        >
          <NRadio
            v-for="item in beginsList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadio>
        </NRadioGroup>
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.calendar.festivalCountdown"
        :label="$t('calendar.festivalCountdown')"
      />

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.calendar.width"
          :label="$t('common.width')"
          :min="1"
          :max="100"
          :step="1"
        />

        <NumberField
          v-model="localConfig.calendar.borderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="50"
          :step="0.1"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 今日样式 -->
    <SettingFormSection
      :title="$t('calendar.sectionTodayStyle')"
      :icon="ICONS.calendarToday"
    >
      <ColorField
        v-model="localConfig.calendar.todayItemBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.todayDayFontColor"
          :label="$t('calendar.dayFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.todayDescFontColor"
          :label="$t('calendar.descFontColorLabel')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.todayLabelFontColor"
          :label="$t('calendar.todayLabelFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.todayLabelBackgroundColor"
          :label="$t('calendar.todayLabelBackgroundColorLabel')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 休息日样式 -->
    <SettingFormSection
      :title="$t('calendar.sectionRestStyle')"
      :icon="ICONS.calendarRest"
    >
      <ColorField
        v-model="localConfig.calendar.restItemBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.restDayFontColor"
          :label="$t('calendar.dayFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.restDescFontColor"
          :label="$t('calendar.descFontColorLabel')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.restLabelFontColor"
          :label="$t('calendar.restLabelFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.restLabelBackgroundColor"
          :label="$t('calendar.restLabelBackgroundColorLabel')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 工作日样式 -->
    <SettingFormSection
      :title="$t('calendar.sectionWorkStyle')"
      :icon="ICONS.calendarWork"
    >
      <ColorField
        v-model="localConfig.calendar.workItemBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.workDayFontColor"
          :label="$t('calendar.dayFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.workDescFontColor"
          :label="$t('calendar.descFontColorLabel')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.workLabelFontColor"
          :label="$t('calendar.workLabelFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendar.workLabelBackgroundColor"
          :label="$t('calendar.workLabelBackgroundColorLabel')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 全局配色 -->
    <SettingFormSection
      :title="$t('calendar.sectionGlobalColor')"
      :icon="ICONS.palette"
    >
      <FontField
        v-model:font-family="localConfig.calendar.fontFamily"
        v-model:font-color="localConfig.calendar.fontColor"
        v-model:font-size="localConfig.calendar.fontSize"
        :label="$t('common.font')"
      />

      <FontField
        v-model:font-family="localConfig.calendar.dayFontFamily"
        v-model:font-color="localConfig.calendar.dayFontColor"
        v-model:font-size="localConfig.calendar.dayFontSize"
        :label="$t('calendar.dayFontLabel')"
      />

      <FontField
        v-model:font-family="localConfig.calendar.descFontFamily"
        v-model:font-color="localConfig.calendar.descFontColor"
        v-model:font-size="localConfig.calendar.descFontSize"
        :label="$t('calendar.descFontLabel')"
      />

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendar.backgroundColor"
          :label="$t('common.backgroundColor')"
        />

        <NumberField
          v-model="localConfig.calendar.backgroundBlur"
          :label="$t('common.blur')"
          :min="0"
          :max="30"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ToggleColorField
          v-model:enable="localConfig.calendar.isBorderEnabled"
          v-model:color="localConfig.calendar.borderColor"
          v-model:width="localConfig.calendar.borderWidth"
          :label="$t('common.border')"
        />

        <ToggleColorField
          v-model:enable="localConfig.calendar.isShadowEnabled"
          v-model:color="localConfig.calendar.shadowColor"
          :label="$t('common.shadow')"
        />
      </SettingFormInlineRow>

      <ColorField
        v-model="localConfig.calendar.holidayFontColor"
        :label="$t('calendar.holidayFontColorLabel')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
