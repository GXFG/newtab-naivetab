<script setup lang="ts">
import { createTab } from '@/logic/util'
import { isEdge } from '@/env'
import { URL_NAIVETAB_DOC_HOME, URL_CHROME_STORE, URL_EDGE_STORE } from '@/logic/const'
import { getStyleConst, localConfig, globalState, openSponsorModal } from '@/logic/store'
import pkg from '../../../../package.json'
import GeneralSetting from './components/GeneralSetting/index.vue'
import BookmarkSetting from './components/BookmarkSetting/index.vue'
import ClockSetting from './components/ClockSetting/index.vue'
import CalendarSetting from './components/CalendarSetting.vue'
import SearchSetting from './components/SearchSetting.vue'
import MemoSetting from './components/MemoSetting.vue'
import WeatherSetting from './components/WeatherSetting.vue'
import NewsSetting from './components/NewsSetting.vue'

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
    name: 'clockDate',
    label: `${window.$t('setting.clock')}/${window.$t('setting.date')}`,
    component: ClockSetting,
  },
  {
    name: 'calendar',
    label: window.$t('setting.calendar'),
    component: CalendarSetting,
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
  {
    name: 'weather',
    label: window.$t('setting.weather'),
    component: WeatherSetting,
  },
  {
    name: 'news',
    label: window.$t('setting.news'),
    component: NewsSetting,
  },
])

const onTabsChange = (tabName: string) => {
  globalState.currSettingTabValue = tabName
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
const bgBottomBar = getStyleConst('bgBottomBar')
</script>

<template>
  <div id="background__drawer" />

  <div id="preset-theme__drawer" />

  <div id="setting">
    <!-- Drawer: height仅在位置是 top 和 bottom 时生效 -->
    <NDrawer
      v-model:show="globalState.isSettingDrawerVisible"
      class="drawer-wrap"
      :style="drawerStyle"
      :width="610"
      :height="400"
      :placement="localConfig.general.drawerPlacement"
      show-mask="transparent"
      to="#setting"
    >
      <NDrawerContent>
        <div class="drawer__content">
          <NTabs
            type="line"
            :value="globalState.currSettingTabValue"
            @update:value="onTabsChange"
          >
            <NTabPane
              v-for="item of tabPaneList"
              :key="item.name"
              :name="item.name"
              :tab="item.label"
            >
              <component :is="item.component" />
            </NTabPane>
          </NTabs>
        </div>

        <!-- bottom -->
        <div
          class="drawer__bottom"
          :style="`background-color: ${bgBottomBar};`"
        >
          <div class="bottom__left">
            <NButton
              class="left__item"
              size="small"
              title="Preview"
              @mouseenter="handlerPreviewEnter"
              @mouseleave="handlerPreviewLeave"
            >
              <fe:picture />&nbsp;{{ $t('common.preview') }}
            </NButton>
          </div>

          <p class="bottom__version">Ver. {{ `${pkg.version}` }}</p>

          <div class="bottom__right">
            <NButton
              text
              class="right__icon"
              :title="$t('rightMenu.userGuide')"
              @click="createTab(URL_NAIVETAB_DOC_HOME)"
            >
              <material-symbols:book-2-outline />
            </NButton>
            <NButton
              text
              class="right__icon"
              :title="$t('rightMenu.buyACupOfCoffee')"
              @click="openSponsorModal()"
            >
              <ci:coffee-togo />
            </NButton>
            <NButton
              text
              class="right__icon"
              :title="$t('rightMenu.goodReview')"
              @click="createTab(isEdge ? URL_EDGE_STORE : URL_CHROME_STORE)"
            >
              <ph:thumbs-up-bold />
            </NButton>
          </div>
        </div>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style>
#setting {
  .n-drawer .n-drawer-content.n-drawer-content--native-scrollbar .n-drawer-body-content-wrapper {
    margin-top: 50px;
    padding: 0 var(--n-body-padding);
    padding-bottom: 94px;
  }
  .n-radio-group {
    width: 100%;
  }
  .n-radio {
    width: 20%;
  }
  /* collapse title */
  .n-collapse-item__header-main {
    font-size: 16px;
    font-weight: 500 !important;
  }
  .n-divider:not(.n-divider--vertical) {
    margin-top: 15px;
    margin-bottom: 15px;
  }
  .n-divider .n-divider__title {
    font-size: 15px !important;
  }

  .drawer-wrap {
    transition: all 0.3s ease;
    .drawer__content {
      padding-bottom: 80px;
      .n-tabs-tab__label {
        user-select: none;
      }
      .n-tabs-nav {
        /* 抽屉的z-index为2000 */
        z-index: 2000;
        position: absolute;
        top: 0;
        left: 0;
        padding: 5px 20px 0 20px;
        width: 100%;
        user-select: none;
        background-color: var(--n-color);
      }
      .n-tab-pane {
        padding: 0;
        user-select: none;
      }
    }
    .drawer__bottom {
      z-index: 2000;
      position: absolute;
      left: 0px;
      bottom: 0px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 13px 5px 13px;
      width: 100%;
      .bottom__left {
        display: flex;
        justify-content: center;
        align-items: center;
        .left__item {
          margin-right: 10px;
        }
      }
      .bottom__version {
        opacity: 0.8;
        font-size: 13px;
      }
      .bottom__right {
        display: flex;
        justify-content: center;
        align-items: center;
        .right__icon {
          margin-left: 12px;
          font-size: 18px;
        }
      }
    }
  }
}
</style>
