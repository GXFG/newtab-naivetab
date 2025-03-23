<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { gaProxy } from '@/logic/gtag'
import { isDragMode, toggleIsDragMode, getTargetDataFromEvent } from '@/logic/moveable'
import { toggleFullscreen, switchSettingDrawerVisible, globalState } from '@/logic/store'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  currComponentName: '' as settingPanes,
})

const renderIconFunc = (icon: string) => () => h(Icon, { icon })

const menuList = computed(() => {
  const resList = [
    {
      label: (state.currComponentName.length === 0 ? window.$t('setting.general') : window.$t(`setting.${state.currComponentName}`)) + window.$t('common.setting'),
      key: 'setting',
      icon: renderIconFunc('ion:settings-outline'),
      disabled: isDragMode.value,
    },
    {
      label: isDragMode.value ? window.$t('rightMenu.doneEdit') : window.$t('rightMenu.editLayout'),
      key: 'editLayout',
      icon: renderIconFunc('tabler:drag-drop'),
    },
    {
      label: `${globalState.isFullScreen ? window.$t('common.exit') : ''}${window.$t('rightMenu.fullscreen')}`,
      key: 'fullscreen',
      icon: renderIconFunc('dashicons:fullscreen-alt'),
    },
    {
      type: 'divider',
      key: 'd1',
    },
    {
      label: window.$t('setting.aboutSponsor'),
      key: 'aboutSponsor',
      icon: renderIconFunc('ci:coffee-togo'),
    },
    {
      label: window.$t('setting.aboutIndex'),
      key: 'aboutIndex',
      icon: renderIconFunc('ix:about'),
    },
  ]
  return resList
})

const openSettingPane = (tabValue: settingPanes) => {
  globalState.currSettingTabValue = tabValue
  switchSettingDrawerVisible(true)
  gaProxy('click', ['rightMenu', tabValue])
}

const menuActionMap = {
  setting: () => {
    let settingDrawerTabName = state.currComponentName
    // 时钟、日期的设置均在同一tab页内
    if (['clockDigital', 'clockAnalog', 'date'].includes(settingDrawerTabName)) {
      settingDrawerTabName = 'clockDate'
    }
    const tabValue = settingDrawerTabName.length === 0 ? 'general' : settingDrawerTabName
    openSettingPane(tabValue)
  },
  editLayout: () => {
    switchSettingDrawerVisible(false)
    toggleIsDragMode()
    gaProxy('click', ['rightMenu', 'editLayout'])
  },
  fullscreen: () => {
    toggleFullscreen()
    gaProxy('click', ['rightMenu', 'fullscreen'])
  },
  aboutSponsor: () => {
    openSettingPane('aboutSponsor')
  },
  aboutIndex: () => {
    openSettingPane('aboutIndex')
  },
}

const onSelectMenu = (key: string) => {
  state.isMenuVisible = false
  const action = menuActionMap[key]
  if (action) {
    action()
  }
}

const onClickoutside = (e: MouseEvent) => {
  if (e.button === 0) {
    state.isMenuVisible = false
  }
}

const openMenu = async (e: MouseEvent) => {
  state.posX = e.clientX
  state.posY = e.clientY
  const targetData = getTargetDataFromEvent(e)
  state.currComponentName = targetData.name as settingPanes
  state.isMenuVisible = true
}

const handleContextMenu = async (e: MouseEvent) => {
  e.preventDefault()
  if (globalState.isGuideMode) {
    return
  }
  if (isDragMode.value) {
    toggleIsDragMode(false)
  }
  if (globalState.isGuideMode || globalState.isSettingDrawerVisible) {
    return
  }
  if (!state.isMenuVisible) {
    openMenu(e)
    return
  }
  state.isMenuVisible = false
  setTimeout(() => {
    openMenu(e)
  }, 200)
}

document.oncontextmenu = handleContextMenu
</script>

<template>
  <NDropdown
    placement="bottom-start"
    trigger="manual"
    :show="state.isMenuVisible"
    :x="state.posX"
    :y="state.posY"
    :options="menuList"
    @clickoutside="onClickoutside"
    @select="onSelectMenu"
  />
</template>

<style>
.n-dropdown-menu {
  user-select: none;
  .n-dropdown-option-body__prefix {
    z-index: 2;
  }
}
</style>
