<template>
  <div id="setting">
    <!-- setting按钮 -->
    <Moveable componentName="general" @onDrag="(style) => (containerStyle = style)">
      <div data-cname="general">
        <div class="general__container" :style="containerStyle">
          <NButton text :title="`${$t('setting.mainLabel')}`" :style="isDragMode ? 'cursor: move;' : ''" :disabled="isDragMode" @click="openSettingModal()">
            <ic:baseline-settings class="item__icon" />
          </NButton>
        </div>
      </div>
    </Moveable>
    <!-- drag_confirm按钮 -->
    <div v-if="isDragMode" class="drag_confirm__container">
      <NButton text type="primary" @click="toggleIsDragMode()">
        <mdi:exit-to-app class="item__icon" />
      </NButton>
    </div>
    <!-- 抽屉 -->
    <NDrawer v-model:show="isSettingDrawerVisible" display-directive="show" :style="drawerStyle" :width="570" :placement="globalState.setting.general.drawerPlacement">
      <NDrawerContent>
        <NTabs type="line">
          <NTabPane v-for="item of tabPaneList" :key="item.name" :name="item.name" :tab="item.label">
            <component :is="item.component" />
          </NTabPane>
        </NTabs>
      </NDrawerContent>
      <!-- 底部按钮 -->
      <div class="setting__bottom">
        <div class="bottom__left">
          <NButton class="left__item" size="small" title="Preview" @mouseenter="handlerPreviewEnter" @mouseleave="handlerPreviewLeave">
            <ic:round-preview />&nbsp;{{ $t('common.preview') }}
          </NButton>
          <NButton class="left__item" size="small" title="DragMode" @click="openDragMode()">
            <tabler:drag-drop />&nbsp;{{ $t('common.dragMode') }}
          </NButton>
        </div>
        <p class="bottom__version">
          Ver.{{ `${pkg.version}` }}
        </p>
        <div class="bottom__right">
          <NButton text class="right__icon" title="ChangeLog" @click="openNewPage(URL_CHANGELOG)">
            <ic:round-new-releases />
          </NButton>
          <NButton text class="right__icon" title="Github" @click="openNewPage(URL_GITHUB)">
            <carbon:logo-github />
          </NButton>
        </div>
      </div>
    </NDrawer>
  </div>
</template>

<script setup lang="ts">
import { NDrawer, NDrawerContent, NButton, NTabs, NTabPane } from 'naive-ui'
import pkg from '../../../../package.json'
import GeneralSetting from './components/GeneralSetting.vue'
import BookmarkSetting from './components/BookmarkSetting.vue'
import ClockSetting from './components/ClockSetting.vue'
import DateSetting from './components/DateSetting.vue'
import CalendarSetting from './components/CalendarSetting.vue'
import WeatherSetting from './components/WeatherSetting.vue'
import { URL_CHANGELOG, URL_GITHUB, gaEvent, isSettingDrawerVisible, isDragMode, toggleIsDragMode, toggleIsSettingDrawVisible, globalState, getLayoutStyle, openNewPage } from '@/logic'

const tabPaneList: any = shallowRef([])

const initEnumData = () => {
  tabPaneList.value = [
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
      name: 'tabClock',
      label: window.$t('setting.tabClock'),
      component: ClockSetting,
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
}

watch(
  () => globalState.setting.general.lang,
  () => {
    initEnumData()
  },
  { immediate: true },
)

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
const drawerStyle = computed(() => `transition: all 0.3s ease;opacity:${drawerOpacity.value};`)
</script>

<style>
#setting {
  .general__container {
    /* 抽屉的z-index为2000，这里设置入口图标层级低于抽屉 */
    z-index: 1999;
    position: absolute;
    .item__icon {
      font-size: 26px;
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

.n-tabs-nav {
  z-index: 1999;
  position: absolute;
  top: 0;
  left: 0;
  padding: 15px 50px 0 20px;
  width: 570px;
  user-select: none;
  background-color: var(--n-color);
}
.n-tab-pane {
  margin-top: 43px;
  padding: 0 15px 20px 0 !important;
  height: 88vh;
  overflow-y: scroll;
  user-select: none;
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

.setting__bottom {
  position: absolute;
  left: 0px;
  bottom: 0px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px 8px 10px;
  width: 570px;
  background-color: var(--bg-bottom-bar);
  .bottom__left {
    display: flex;
    justify-content: center;
    align-items: center;
    .left__item {
      margin-right: 10px;
    }
  }
  .bottom__version {
  }
  .bottom__right {
    display: flex;
    justify-content: center;
    align-items: center;
    .right__icon {
      margin-left: 10px;
      font-size: 20px;
    }
  }
}
</style>
