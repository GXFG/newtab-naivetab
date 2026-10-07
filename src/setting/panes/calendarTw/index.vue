<script setup lang="ts">
import { localConfig } from '@/logic/config/state'
import { ICONS } from '@/logic/constants/icons'
import {
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
  <SettingFormWrap widget-code="calendarTw">
    <!-- 日历配置 -->
    <SettingFormSection
      :title="$t('calendar.sectionConfig')"
      :icon="ICONS.settings"
    >
      <SettingFormItem :label="$t('calendar.weekBeginsOn')">
        <NTRadioGroup
          v-model:value="localConfig.calendarTw.weekBeginsOn"
          direction="horizontal"
        >
          <NTRadio
            v-for="item in beginsList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NTRadio>
        </NTRadioGroup>
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.calendarTw.festivalCountdown"
        :label="$t('calendar.festivalCountdown')"
      />

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.calendarTw.width"
          :label="$t('common.width')"
          :min="1"
          :max="100"
          :step="1"
        />

        <NumberField
          v-model="localConfig.calendarTw.borderRadius"
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
        v-model="localConfig.calendarTw.todayItemBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendarTw.todayDayFontColor"
          :label="$t('calendar.dayFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendarTw.todayDescFontColor"
          :label="$t('calendar.descFontColorLabel')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendarTw.todayLabelFontColor"
          :label="$t('calendar.todayLabelFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendarTw.todayLabelBackgroundColor"
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
        v-model="localConfig.calendarTw.restItemBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendarTw.restDayFontColor"
          :label="$t('calendar.dayFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendarTw.restDescFontColor"
          :label="$t('calendar.descFontColorLabel')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendarTw.restLabelFontColor"
          :label="$t('calendar.restLabelFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendarTw.restLabelBackgroundColor"
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
        v-model="localConfig.calendarTw.workItemBackgroundColor"
        :label="$t('common.backgroundColor')"
      />
      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendarTw.workDayFontColor"
          :label="$t('calendar.dayFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendarTw.workDescFontColor"
          :label="$t('calendar.descFontColorLabel')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendarTw.workLabelFontColor"
          :label="$t('calendar.workLabelFontColorLabel')"
        />
        <ColorField
          v-model="localConfig.calendarTw.workLabelBackgroundColor"
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
        v-model:font-family="localConfig.calendarTw.fontFamily"
        v-model:font-color="localConfig.calendarTw.fontColor"
        v-model:font-size="localConfig.calendarTw.fontSize"
        :label="$t('common.font')"
      />

      <FontField
        v-model:font-family="localConfig.calendarTw.dayFontFamily"
        v-model:font-color="localConfig.calendarTw.dayFontColor"
        v-model:font-size="localConfig.calendarTw.dayFontSize"
        :label="$t('calendar.dayFontLabel')"
      />

      <FontField
        v-model:font-family="localConfig.calendarTw.descFontFamily"
        v-model:font-color="localConfig.calendarTw.descFontColor"
        v-model:font-size="localConfig.calendarTw.descFontSize"
        :label="$t('calendar.descFontLabel')"
      />

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.calendarTw.backgroundColor"
          :label="$t('common.backgroundColor')"
        />

        <NumberField
          v-model="localConfig.calendarTw.backgroundBlur"
          :label="$t('common.blur')"
          :min="0"
          :max="30"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ToggleColorField
          v-model:enable="localConfig.calendarTw.isBorderEnabled"
          v-model:color="localConfig.calendarTw.borderColor"
          v-model:width="localConfig.calendarTw.borderWidth"
          :label="$t('common.border')"
        />

        <ToggleColorField
          v-model:enable="localConfig.calendarTw.isShadowEnabled"
          v-model:color="localConfig.calendarTw.shadowColor"
          :label="$t('common.shadow')"
        />
      </SettingFormInlineRow>

      <ColorField
        v-model="localConfig.calendarTw.holidayFontColor"
        :label="$t('calendar.holidayFontColorLabel')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
