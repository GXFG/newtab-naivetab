<template>
  <div id="setting">
    <!-- 入口 -->
    <NButton
      class="setting__entry"
      text
      :title="`${$t('setting.mainLabel')}`"
      @click="openSettingModal()"
    >
      <ic:baseline-settings v-show="!isSettingMode" class="item__icon" />
    </NButton>
    <!-- 抽屉 -->
    <NDrawer v-model:show="isSettingMode" :width="570" placement="right">
      <NDrawerContent>
        <NTabs type="line">
          <NTabPane name="tabGeneral" :tab="$t('setting.tabGeneral')">
            <GeneralSetting />
          </NTabPane>
          <NTabPane class="setting__content" name="tabBookmark" :tab="$t('setting.tabBookmark')">
            <BookmarkSetting />
          </NTabPane>
          <NTabPane name="tabDigitalClock" :tab="$t('setting.tabDigitalClock')">
            <ClockDigitalSetting />
          </NTabPane>
          <NTabPane name="tabAnalogClock" :tab="$t('setting.tabAnalogClock')">
            <ClockAnalogSetting />
          </NTabPane>
          <NTabPane name="tabDate" :tab="$t('setting.tabDate')">
            <DateSetting />
          </NTabPane>
          <NTabPane name="tabCalendar" :tab="$t('setting.tabCalendar')">
            <CalendarSetting />
          </NTabPane>
          <NTabPane name="tabWeather" :tab="$t('setting.tabWeather')">
            <WeatherSetting />
          </NTabPane>
        </NTabs>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<script setup lang="ts">
import { NDrawer, NDrawerContent, NButton, NTabs, NTabPane } from 'naive-ui'
import GeneralSetting from './components/GeneralSetting.vue'
import BookmarkSetting from './components/BookmarkSetting.vue'
import ClockDigitalSetting from './components/ClockDigitalSetting.vue'
import ClockAnalogSetting from './components/ClockAnalogSetting.vue'
import DateSetting from './components/DateSetting.vue'
import CalendarSetting from './components/CalendarSetting.vue'
import WeatherSetting from './components/WeatherSetting.vue'
import { gaEvent, isSettingMode, toggleIsSettingMode } from '@/logic'

const openSettingModal = () => {
  toggleIsSettingMode()
  gaEvent('setting-button', 'click', 'open')
}

</script>

<style>
#setting {
  .setting__entry {
    position: fixed;
    top: 50vh;
    right: 2vw;
    z-index: 10;
    .item__icon {
      font-size: 24px;
    }
  }
}
.n-tab-pane {
  user-select: none;
  padding: 0 15px 0 0 !important;
  height: 89vh;
  overflow-y: scroll;
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-thumb {
    background: #808080;
    border-radius: 5px;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  }
  &::-webkit-scrollbar-track {
    background: #ccc;
    border-radius: 5px;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  }
}
</style>
