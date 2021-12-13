<template>
  <div id="setting">
    <!-- 入口 -->
    <div class="setting__entry" :style="containerStyle">
      <NButton text :title="`${$t('setting.mainLabel')}`" @click="openSettingModal()">
        <ic:baseline-settings class="item__icon" />
      </NButton>
    </div>
    <!-- 抽屉 -->
    <NDrawer v-model:show="isSettingDrawerVisible" :style="drawerStyle" :width="570" :height="500" :placement="globalState.setting.general.drawerPlacement">
      <NDrawerContent>
        <NTabs type="line">
          <NTabPane name="tabGeneral" :tab="$t('setting.tabGeneral')">
            <GeneralSetting />
          </NTabPane>
          <NTabPane name="tabBookmark" :tab="$t('setting.tabBookmark')">
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
      <!-- 底部信息 -->
      <div class="bottom__left">
        <NButton text class="preview__icon" title="Preview" @mouseenter="handlerPreviewEnter" @mouseleave="handlerPreviewLeave">
          <ic:round-preview />
        </NButton>
      </div>
      <p class="bottom__version">
        {{ `${$t('common.version')}: ${pkg.version}` }}
      </p>
      <div class="bottom__right">
        <NButton text class="right__icon" title="ChangeLog" @click="openNewPage(URL_CHANGELOG)">
          <ic:round-new-releases />
        </NButton>
        <NButton text class="right__icon" title="Github" @click="openNewPage(URL_GITHUB)">
          <carbon:logo-github />
        </NButton>
      </div>
    </NDrawer>
  </div>
</template>

<script setup lang="ts">
import { NDrawer, NDrawerContent, NButton, NTabs, NTabPane } from 'naive-ui'
import pkg from '../../../../package.json'
import GeneralSetting from './components/GeneralSetting.vue'
import BookmarkSetting from './components/BookmarkSetting.vue'
import ClockDigitalSetting from './components/ClockDigitalSetting.vue'
import ClockAnalogSetting from './components/ClockAnalogSetting.vue'
import DateSetting from './components/DateSetting.vue'
import CalendarSetting from './components/CalendarSetting.vue'
import WeatherSetting from './components/WeatherSetting.vue'
import { URL_CHANGELOG, URL_GITHUB, gaEvent, isSettingDrawerVisible, toggleIsSettingDrawVisible, globalState, getLayoutStyle, openNewPage } from '@/logic'

const openSettingModal = () => {
  toggleIsSettingDrawVisible()
  gaEvent('setting-button', 'click', 'open')
}

const drawerOpacity = ref(1)
const handlerPreviewEnter = () => {
  drawerOpacity.value = 0
}
const handlerPreviewLeave = () => {
  drawerOpacity.value = 1
}

const CNAME = 'general'
const drawerStyle = computed(() => `transition: all 0.3s ease;opacity:${drawerOpacity.value};`)
const positionStyle = computed(() => getLayoutStyle(CNAME))

const containerStyle = computed(() => {
  return positionStyle.value
})
</script>

<style scoped>
#setting {
  .setting__entry {
    /* 抽屉的z-index为2000，这里设置入口图标层级低于抽屉 */
    z-index: 1999;
    position: fixed;
    transition: all 0.3s ease;
    .item__icon {
      font-size: 24px;
    }
  }
}

.n-tabs-tab__label {
  user-select: none;
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

.bottom__left {
  position: absolute;
  left: 13px;
  bottom: 3px;
  .preview__icon {
    font-size: 26px;
  }
}
.bottom__version {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translate(-50%, 0);
}
.bottom__right {
  position: absolute;
  right: 13px;
  bottom: 3px;
  .right__icon {
    margin-left: 10px;
    font-size: 20px;
  }
}
</style>
