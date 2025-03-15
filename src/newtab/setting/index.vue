<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { getStyleConst, localConfig, globalState } from '@/logic/store'
import GeneralSetting from './GeneralSetting/index.vue'
import BookmarkSetting from './BookmarkSetting/index.vue'
import ClockSetting from './ClockSetting/index.vue'
import CalendarSetting from './CalendarSetting.vue'
import YearProgressSetting from './YearProgressSetting.vue'
import SearchSetting from './SearchSetting.vue'
import MemoSetting from './MemoSetting.vue'
import WeatherSetting from './WeatherSetting.vue'
import NewsSetting from './NewsSetting.vue'
import About from './About.vue'
// @@@@ add Components 5

const tabPaneList = computed(() => [
  {
    name: 'general',
    label: window.$t('setting.general'),
    component: GeneralSetting,
    iconName: 'mdi:clock-digital',
  },
  {
    name: 'bookmark',
    label: window.$t('setting.bookmark'),
    component: BookmarkSetting,
    iconName: 'mdi:clock-digital',
  },
  {
    name: 'clockDate',
    label: `${window.$t('setting.clock')}/${window.$t('setting.date')}`,
    component: ClockSetting,
    iconName: 'mdi:clock-digital',
  },
  {
    name: 'calendar',
    label: window.$t('setting.calendar'),
    component: CalendarSetting,
    iconName: 'mdi:clock-digital',
  },
  {
    name: 'yearProgress',
    label: window.$t('setting.yearProgress'),
    component: YearProgressSetting,
    iconName: 'mdi:clock-digital',
  },
  {
    name: 'search',
    label: window.$t('setting.search'),
    component: SearchSetting,
    iconName: 'mdi:clock-digital',
  },
  {
    name: 'memo',
    label: window.$t('setting.memo'),
    component: MemoSetting,
    iconName: 'mdi:clock-digital',
  },
  {
    name: 'weather',
    label: window.$t('setting.weather'),
    component: WeatherSetting,
    iconName: 'mdi:clock-digital',
  },
  {
    name: 'news',
    label: window.$t('setting.news'),
    component: NewsSetting,
    iconName: 'mdi:clock-digital',
  },
  {
    name: 'about',
    label: window.$t('setting.about'),
    component: About,
    iconName: 'mdi:clock-digital',
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
    <NButton
      class="content__btn"
      size="small"
      :title="$t('common.preview')"
      @mouseenter="handlerPreviewEnter"
      @mouseleave="handlerPreviewLeave"
    >
      <fe:picture />&nbsp;{{ $t('common.preview') }}
    </NButton>

    <!-- Drawer: height仅在位置是 top 和 bottom 时生效 -->
    <NDrawer
      v-model:show="globalState.isSettingDrawerVisible"
      class="drawer-wrap"
      :style="drawerStyle"
      :width="650"
      :height="400"
      :placement="localConfig.general.drawerPlacement"
      show-mask="transparent"
      to="#setting"
    >
      <NDrawerContent>
        <NTabs
          type="line"
          :value="globalState.currSettingTabValue"
          placement="left"
          animated
          @update:value="onTabsChange"
        >
          <NTabPane
            v-for="item of tabPaneList"
            :key="item.name"
            :name="item.name"
            :tab="item.label"
          >
            <template #tab>
              <div class="tab__title">
                <Icon :icon="item.iconName" />
                <span>{{ item.label }}</span>
              </div>
            </template>
            <component :is="item.component" />
          </NTabPane>
        </NTabs>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style>
#setting {
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

  .n-drawer .n-drawer-content.n-drawer-content--native-scrollbar .n-drawer-body-content-wrapper {
    padding: 0 !important;
  }
  .drawer-wrap {
    transition: all 0.3s ease;
    /* nav */
    .n-tabs-nav-scroll-wrapper {
      padding: 12px 5px;
    }
    /* content */
    .n-tab-pane {
      padding: 0 15px 15px 15px !important;
      overflow: auto;
      user-select: none;
      box-sizing: border-box;
    }

    .drawer__bottom {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      padding: 8px 15px;
      box-sizing: border-box;
      width: 100%;
      .bottom__content {
        display: flex;
        align-items: center;
        .content__btn {
          margin: 0 4px;
        }
        .content__version {
          opacity: 0.85;
        }
      }
      .bottom__left {
        justify-content: flex-start;
      }
      .bottom__center {
        justify-content: center;
      }
      .bottom__right {
        justify-content: flex-end;
      }
    }
  }
}
</style>
