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
    <NDrawer v-model:show="isSettingMode" :width="500" placement="right">
      <NDrawerContent>
        <NTabs class="setting__tabs" type="line">
          <NTabPane name="tabBookmarks" :tab="$t('setting.tabBookmarks')">
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
.setting__tabs {
  user-select: none;
}
</style>
