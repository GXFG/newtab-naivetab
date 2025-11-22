<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { Icon } from '@iconify/vue'
import { localConfig, globalState } from '@/logic/store'
import { settingsList } from './registry'
import { ICONS } from '@/logic/icons'

const tabPaneList = computed(() => settingsList)

const onTabsChange = (tabCode: string) => {
  globalState.currSettingTabCode = tabCode
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
      console.error('setting__content Target not found!')
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
          :value="globalState.currSettingTabCode"
          placement="left"
          animated
          @update:value="onTabsChange"
        >
          <NTabPane
            v-for="item of tabPaneList"
            :key="item.code"
            :name="item.code"
            :tab="item.labelKeys ? `${$t(item.labelKeys[0])} / ${$t(item.labelKeys[1])}` : $t(item.labelKey || '')"
          >
            <template #tab>
              <div class="tab__title">
                <div
                  class="title__icon"
                  :style="`font-size: ${item.iconSize}px`"
                >
                  <Icon :icon="item.iconName" />
                </div>
                <span class="title__text">{{ item.labelKeys ? `${$t(item.labelKeys[0])} / ${$t(item.labelKeys[1])}` : $t(item.labelKey || '') }}</span>
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
                <Icon :icon="ICONS.preview" />&nbsp;{{ $t('common.preview') }}
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
    .n-tabs .n-tabs-nav {
      padding: 10px 5px 3px 5px;
      .n-tabs-nav-scroll-wrapper {
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
          .title__text {
            user-select: none;
          }
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
