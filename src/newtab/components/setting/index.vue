<template>
  <div id="setting">
    <!-- setting按钮 -->
    <Moveable componentName="general" @onDrag="(style) => (containerStyle = style)">
      <div class="general__container" :style="containerStyle" cname="general">
        <NButton text :title="`${$t('setting.mainLabel')}`" :style="isDragMode ? 'cursor: move;' : ''" :disabled="isDragMode" @click="openSettingModal()">
          <ic:baseline-settings class="item__icon" />
        </NButton>
      </div>
    </Moveable>
    <!-- drag_confirm按钮 -->
    <div v-if="isDragMode" class="drag_confirm__container">
      <NButton text type="primary" @click="toggleIsDragMode()">
        <mdi:exit-to-app class="item__icon" />
      </NButton>
    </div>
    <!-- 抽屉 -->
    <NDrawer
      v-model:show="isSettingDrawerVisible"
      display-directive="show"
      :style="drawerStyle"
      :width="570"
      :height="500"
      :placement="globalState.setting.general.drawerPlacement"
    >
      <NDrawerContent>
        <NTabs type="line">
          <NTabPane v-for="item of tabPaneList" :key="item.name" :name="item.name" :tab="item.label">
            <component :is="item.component" />
          </NTabPane>
        </NTabs>
      </NDrawerContent>
      <!-- 底部按钮 -->
      <div class="bottom__left">
        <NButton class="left__item" size="small" title="Preview" @mouseenter="handlerPreviewEnter" @mouseleave="handlerPreviewLeave">
          <ic:round-preview />&nbsp;{{ $t('common.preview') }}
        </NButton>
        <NButton class="left__item" size="small" title="DragMode" @click="openDragMode()">
          <tabler:drag-drop />&nbsp;{{ $t('common.dragMode') }}
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
import { URL_CHANGELOG, URL_GITHUB, gaEvent, isSettingDrawerVisible, isDragMode, toggleIsDragMode, toggleIsSettingDrawVisible, globalState, getLayoutStyle, openNewPage } from '@/logic'

const tabPaneList = [
  {
    name: 'tabGeneral',
    label: window.$t('setting.tabGeneral'),
    component: GeneralSetting,
  },
  {
    name: 'tabBookmark',
    label: window.$t('setting.tabBookmark'),
    component: BookmarkSetting,
  },
  {
    name: 'tabDigitalClock',
    label: window.$t('setting.tabDigitalClock'),
    component: ClockDigitalSetting,
  },
  {
    name: 'tabAnalogClock',
    label: window.$t('setting.tabAnalogClock'),
    component: ClockAnalogSetting,
  },
  {
    name: 'tabDate',
    label: window.$t('setting.tabDate'),
    component: DateSetting,
  },
  {
    name: 'tabCalendar',
    label: window.$t('setting.tabCalendar'),
    component: CalendarSetting,
  },
  {
    name: 'tabWeather',
    label: window.$t('setting.tabWeather'),
    component: WeatherSetting,
  },
]

const openSettingModal = () => {
  if (isDragMode.value) {
    return
  }
  toggleIsSettingDrawVisible()
  gaEvent('setting-button', 'click', 'open')
}

const openDragMode = () => {
  if (isDragMode.value) {
    return
  }
  toggleIsSettingDrawVisible()
  toggleIsDragMode()
}

const drawerOpacity = ref(1)
const handlerPreviewEnter = () => {
  drawerOpacity.value = 0
}
const handlerPreviewLeave = () => {
  drawerOpacity.value = 1
}

const CNAME = 'general'
const containerStyle = ref(getLayoutStyle(CNAME))
// watchEffect(() => containerStyle.value = getLayoutStyle(CNAME))

const drawerStyle = computed(() => `transition: all 0.3s ease;opacity:${drawerOpacity.value};`)
</script>

<style scoped>
#setting {
  .general__container {
    /* 抽屉的z-index为2000，这里设置入口图标层级低于抽屉 */
    z-index: 1999;
    position: absolute;
    .item__icon {
      font-size: 24px;
    }
  }
  .drag_confirm__container {
    z-index: 1999;
    position: absolute;
    top: 3%;
    right: 2%;
    .item__icon {
      font-size: 28px;
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
  bottom: 6px;
  .left__item {
    margin-right: 10px;
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
