<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { gaProxy } from '@/logic/gtag'
import { isDragMode, toggleIsDragMode, getTargetDataFromEvent } from '@/logic/moveable'
import { toggleFullscreen, switchSettingDrawerVisible, globalState, localConfig } from '@/logic/store'
import { WIDGET_CODE_LIST } from '@/newtab/widgets/codes'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  currTargetCode: '' as EleTargetCode | '',
})

const renderIconFunc = (icon: string) => () => h(Icon, { icon })

const menuList = computed(() => {
  const isFocusMode = localConfig.general.isFocusMode
  const isHoverWidget = state.currTargetCode.length !== 0
  const list = [
    {
      label: (isHoverWidget ? window.$t(`setting.${state.currTargetCode}`) : window.$t('setting.general')) + window.$t('common.setting'),
      key: 'setting',
      icon: renderIconFunc(ICONS.settings),
      disabled: isDragMode.value,
    },
    {
      label: isDragMode.value ? window.$t('rightMenu.doneEdit') : window.$t('rightMenu.editLayout'),
      key: 'editLayout',
      icon: renderIconFunc(ICONS.dragDrop),
    },
    { type: 'divider', key: 'd1' },
    {
      label: `${isFocusMode ? window.$t('common.exit') : ''}${window.$t('rightMenu.focusMode')}`,
      key: 'focusMode',
      icon: renderIconFunc(ICONS.focus),
    },
    ...(
      isFocusMode
        ? [{ label: window.$t('rightMenu.editFocusMode'), key: 'editFocusMode', icon: renderIconFunc('mdi:tune'), disabled: isDragMode.value }]
        : []
    ),
    {
      label: `${globalState.isFullScreen ? window.$t('common.exit') : ''}${window.$t('rightMenu.fullscreen')}`,
      key: 'fullscreen',
      icon: renderIconFunc(ICONS.fullscreen),
    },
    ...(
      !isFocusMode
        ? [{ type: 'divider', key: 'd2' },
            { label: window.$t('setting.aboutSponsor'), key: 'aboutSponsor', icon: renderIconFunc(ICONS.sponsor) }]
        : []
    ),
  ]
  if (!isFocusMode) {
    if (isHoverWidget) {
      list.push({ type: 'divider', key: 'd3' })
      list.push({ label: window.$t('common.delete'), key: 'deleteWidget', icon: renderIconFunc(ICONS.deleteBin) })
    } else {
      list.push({ label: window.$t('setting.aboutIndex'), key: 'aboutIndex', icon: renderIconFunc(ICONS.info) })
    }
  }
  return list
})

const openSettingPane = (tabValue: settingPanes) => {
  globalState.currSettingTabCode = tabValue
  switchSettingDrawerVisible(true)
  gaProxy('click', ['rightMenu', tabValue])
}

const menuActionMap = {
  setting: () => {
    let settingPaneCode: string = state.currTargetCode
    if (settingPaneCode.length === 0) {
      settingPaneCode = 'general'
    } else if (['clockDigital', 'clockAnalog', 'date'].includes(settingPaneCode)) {
      // 数字时钟、模拟时钟、日期的设置均在同一设置面板内
      settingPaneCode = 'clockDate'
    }
    openSettingPane(settingPaneCode as settingPanes)
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
  focusMode: () => {
    localConfig.general.isFocusMode = !localConfig.general.isFocusMode
    gaProxy('click', ['rightMenu', 'focusMode'])
  },
  editFocusMode: () => {
    openSettingPane('focusMode')
  },
  aboutSponsor: () => {
    openSettingPane('aboutSponsor')
  },
  aboutIndex: () => {
    openSettingPane('aboutIndex')
  },
  deleteWidget: () => {
    const code = state.currTargetCode as WidgetCodes
    if (!WIDGET_CODE_LIST.includes(code)) {
      return
    }
    localConfig[code].enabled = false
    gaProxy('click', ['rightMenu', 'deleteWidget'])
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
  state.currTargetCode = targetData.code
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
