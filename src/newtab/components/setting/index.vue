<template>
  <div id="setting">
    <!-- 入口 -->
    <NButton
      class="setting__entry"
      text
      :title="`${$t('setting.mainLabel')}`"
      @click="toggleIsSettingMode()"
    >
      <ic:baseline-settings v-show="!isSettingMode" class="item__icon" />
    </NButton>
    <!-- 抽屉 -->
    <NDrawer v-model:show="isSettingMode" :width="540" placement="right">
      <NDrawerContent>
        <NTabs type="line">
          <NTabPane class="setting__content" name="tabBookmarks" :tab="$t('setting.tabBookmarks')">
            <BookmarkSetting />
          </NTabPane>
          <NTabPane name="tabClock" :tab="$t('setting.tabClock')">
            <ClockSetting />
          </NTabPane>
          <NTabPane name="tabDate" :tab="$t('setting.tabDate')">
            <DateSetting />
          </NTabPane>
          <NTabPane name="tabCalendar" :tab="$t('setting.tabCalendar')">
            <CalendarSetting />
          </NTabPane>
          <NTabPane name="tabGeneral" :tab="$t('setting.tabGeneral')">
            <GeneralSetting />
          </NTabPane>
        </NTabs>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<script setup lang="ts">
import { NDrawer, NDrawerContent, NButton, NTabs, NTabPane } from 'naive-ui'
import BookmarkSetting from './components/BookmarkSetting.vue'
import ClockSetting from './components/ClockSetting.vue'
import DateSetting from './components/DateSetting.vue'
import CalendarSetting from './components/CalendarSetting.vue'
import GeneralSetting from './components/GeneralSetting.vue'
import { isSettingMode, toggleIsSettingMode } from '@/logic'

</script>

<style>
#setting {
  .setting__entry {
    position: fixed;
    top: 50vh;
    right: 20px;
    z-index: 10;
    .item__icon {
      font-size: 22px;
    }
  }
}
.n-tab-pane {
  user-select: none;
  padding: 15px 15px 0 0 !important;
  height: 92vh;
  overflow-y: scroll;
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    background: #000;
  }
  &::-webkit-scrollbar-track {
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    background: #535353;
  }
}
</style>
