<template>
  <div id="setting">
    <!-- settingIcon -->
    <MoveableComponentWrap componentName="settingIcon" @drag="(style) => (dragStyle = style)">
      <div v-if="isRender" data-target-type="1" data-target-name="settingIcon">
        <div class="settingIcon__container" :style="dragStyle || containerStyle">
          <NButton
            text
            :title="`${$t('setting.mainLabel')}`"
            :style="isDragMode ? 'cursor: move;' : ''"
            :disabled="isDragMode"
            @click="openSettingModal()"
          >
            <ic:baseline-settings class="item__icon" />
          </NButton>
        </div>
      </div>
    </MoveableComponentWrap>
    <!-- Drawer -->
    <NDrawer
      v-model:show="isSettingDrawerVisible"
      class="drawer-wrap"
      :style="drawerStyle"
      display-directive="show"
      :width="600"
      :placement="localState.setting.general.drawerPlacement"
    >
      <NDrawerContent>
        <NTabs type="line" :value="globalState.currSettingTabValue" @update:value="onTabsChange">
          <NTabPane v-for="item of tabPaneList" :key="item.name" :name="item.name" :tab="item.label">
            <component :is="item.component" />
          </NTabPane>
        </NTabs>
      </NDrawerContent>
      <!-- bottom -->
      <div class="drawer__bottom" :style="`background-color: ${bgBottomBar};`">
        <div class="bottom__left">
          <NButton class="left__item" size="small" title="Preview" @mouseenter="handlerPreviewEnter" @mouseleave="handlerPreviewLeave">
            <mdi:eye-circle-outline />&nbsp;{{ $t('common.preview') }}
          </NButton>
          <NButton class="left__item" size="small" title="DragMode" @click="openDragMode()">
            <tabler:drag-drop />&nbsp;{{ $t('common.dragMode') }}
          </NButton>
        </div>
        <p class="bottom__version">
          Ver.{{ `${pkg.version}` }}
        </p>
        <div class="bottom__right">
          <NButton text class="right__icon" title="help" @click="openHelpModal()">
            <bx:bxs-help-circle />
          </NButton>
          <NButton text class="right__icon" title="ChangeLog" @click="openWhatsNewModal()">
            <ic:round-new-releases />
          </NButton>
          <NButton text class="right__icon" title="Github" @click="createTab(URL_GITHUB)">
            <carbon:logo-github />
          </NButton>
        </div>
      </div>
    </NDrawer>
  </div>
</template>

<script setup lang="ts">
import pkg from '../../../../package.json'
import GeneralSetting from './components/GeneralSetting/index.vue'
import ClockSetting from './components/ClockSetting/index.vue'
import BookmarkSetting from './components/BookmarkSetting/index.vue'
import DateSetting from './components/DateSetting.vue'
import SearchSetting from './components/SearchSetting.vue'
import CalendarSetting from './components/CalendarSetting.vue'
import WeatherSetting from './components/WeatherSetting.vue'
import MemoSetting from './components/MemoSetting.vue'
import {
  URL_GITHUB,
  gaEvent,
  getIsComponentRender,
  getLayoutStyle,
  getStyleConst,
  localState,
  globalState,
  isDragMode,
  isSettingDrawerVisible,
  createTab,
  openHelpModal,
  openWhatsNewModal,
  toggleIsDragMode,
  toggleIsSettingDrawerVisible,
} from '@/logic'

const CNAME = 'settingIcon'
const isRender = getIsComponentRender(CNAME)

const tabPaneList = computed(() => [
  {
    name: 'general',
    label: window.$t('setting.general'),
    component: GeneralSetting,
  },
  {
    name: 'bookmark',
    label: window.$t('setting.bookmark'),
    component: BookmarkSetting,
  },
  {
    name: 'clock',
    label: window.$t('setting.clock'),
    component: ClockSetting,
  },
  {
    name: 'date',
    label: window.$t('setting.date'),
    component: DateSetting,
  },
  {
    name: 'calendar',
    label: window.$t('setting.calendar'),
    component: CalendarSetting,
  },
  {
    name: 'weather',
    label: window.$t('setting.weather'),
    component: WeatherSetting,
  },
  {
    name: 'search',
    label: window.$t('setting.search'),
    component: SearchSetting,
  },
  {
    name: 'memo',
    label: window.$t('setting.memo'),
    component: MemoSetting,
  },
])

const onTabsChange = (tabName: string) => {
  globalState.value.currSettingTabValue = tabName
}

const openSettingModal = () => {
  if (isDragMode.value) {
    return
  }
  toggleIsSettingDrawerVisible(true)
  gaEvent('setting-button', 'click', 'open')
}

const openDragMode = () => {
  toggleIsSettingDrawerVisible(false)
  toggleIsDragMode(true)
}

const drawerOpacity = ref(1)
const handlerPreviewEnter = () => {
  drawerOpacity.value = 0
  const mask = document.querySelector('.n-drawer-mask') as HTMLElement
  mask.setAttribute('style', 'transition: all 0.3s ease;background-color: transparent;')
}
const handlerPreviewLeave = () => {
  drawerOpacity.value = 1
  const mask = document.querySelector('.n-drawer-mask') as HTMLElement
  mask.style.backgroundColor = ''
}

const drawerStyle = computed(() => `opacity:${drawerOpacity.value};`)
const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const bgBottomBar = getStyleConst('bgBottomBar')
</script>

<style>
.settingIcon__container {
  z-index: 10;
  position: absolute;
  .item__icon {
    font-size: 28px;
  }
}

.n-tabs-tab__label {
  user-select: none;
}

.n-tabs-nav {
  /* 抽屉的z-index为2000 */
  z-index: 2000;
  position: absolute;
  top: 0;
  left: 0;
  padding: 15px 50px 0 20px;
  width: 600px;
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

.drawer-wrap {
  transition: all 0.3s ease;
  .setting__content {
    padding-top: 20px;
    /* collapse title */
    .n-collapse-item__header-main {
      font-size: 16px;
      font-weight: 500 !important;
    }
  }
  .drawer__bottom {
    position: absolute;
    left: 0px;
    bottom: 0px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px 8px 10px;
    width: 600px;
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
}
</style>
