<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { Icon } from '@iconify/vue'
import { localConfig, globalState } from '@/logic/store'
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
    iconName: 'ion:settings-outline',
    iconSize: 18,
  },
  {
    name: 'bookmark',
    label: window.$t('setting.bookmark'),
    component: BookmarkSetting,
    iconName: 'ic:outline-keyboard-alt',
    iconSize: 18,
  },
  {
    name: 'clockDate',
    label: `${window.$t('setting.clock')}/${window.$t('setting.date')}`,
    component: ClockSetting,
    iconName: 'grommet-icons:clock',
    iconSize: 18,
  },
  {
    name: 'calendar',
    label: window.$t('setting.calendar'),
    component: CalendarSetting,
    iconName: 'uiw:date',
    iconSize: 16,
  },
  {
    name: 'yearProgress',
    label: window.$t('setting.yearProgress'),
    component: YearProgressSetting,
    iconName: 'lets-icons:time-progress',
    iconSize: 18,
  },
  {
    name: 'search',
    label: window.$t('setting.search'),
    component: SearchSetting,
    iconName: 'fluent:search-square-24-regular',
    iconSize: 18,
  },
  {
    name: 'memo',
    label: window.$t('setting.memo'),
    component: MemoSetting,
    iconName: 'material-symbols:note-alt-outline',
    iconSize: 18,
  },
  {
    name: 'weather',
    label: window.$t('setting.weather'),
    component: WeatherSetting,
    iconName: 'mdi:weather-cloudy',
    iconSize: 18,
  },
  {
    name: 'news',
    label: window.$t('setting.news'),
    component: NewsSetting,
    iconName: 'majesticons:newspaper-line',
    iconSize: 18,
  },
  {
    name: 'about',
    label: window.$t('setting.about'),
    component: About,
    iconName: 'ix:about',
    iconSize: 18,
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

const settingContentHeight = ref(0)

const updateSettingContentHeightFunc = useDebounceFn((entries: ResizeObserverEntry[]) => {
  if (entries.length === 0) {
    return
  }
  const height = entries[0].contentRect.height
  settingContentHeight.value = height
}, 200)

const settingContentObserver = new ResizeObserver(updateSettingContentHeightFunc)

watch(
  () => globalState.isSettingDrawerVisible,
  async () => {
    if (!globalState.isSettingDrawerVisible) {
      settingContentObserver.disconnect()
      return
    }
    await nextTick()
    const targetEl = document.querySelector('#setting .setting__content') as HTMLElement
    if (targetEl) {
      settingContentObserver.observe(targetEl)
    } else {
      console.error('setting__content Target element not found!')
    }
  },
)

const drawerStyle = computed(() => `opacity:${drawerOpacity.value};`)
const settingContentHeightStyle = computed(() => `${settingContentHeight.value}px`)
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
      :width="650"
      :height="500"
      :placement="localConfig.general.drawerPlacement"
      show-mask="transparent"
      to="#setting"
    >
      <NDrawerContent class="setting__content">
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
                <div
                  class="title__icon"
                  :style="`font-size: ${item.iconSize}px`"
                >
                  <Icon :icon="item.iconName" />
                </div>
                <span>{{ item.label }}</span>
              </div>
            </template>

            <template #default>
              <component :is="item.component" />
            </template>
          </NTabPane>
          <template #suffix>
            <div class="suffix__item">
              <NButton
                size="small"
                :title="$t('common.preview')"
                @mouseenter="handlerPreviewEnter"
                @mouseleave="handlerPreviewLeave"
              >
                <fe:picture />&nbsp;{{ $t('common.preview') }}
              </NButton>
            </div>
          </template>
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
      height: v-bind(settingContentHeightStyle);
      .tab__title {
        display: flex;
        justify-content: center;
        align-items: center;
        .title__icon {
          margin-right: 5px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }
    }

    /* content */
    .n-tab-pane {
      padding: 0 15px 15px 15px !important;
      height: v-bind(settingContentHeightStyle);
      overflow: auto;
      user-select: none;
      box-sizing: border-box;
    }

    .suffix__item {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
  }
}
</style>
