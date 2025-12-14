<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { gaProxy } from '@/logic/gtag'
import { isDragMode, toggleIsDragMode, getTargetDataFromEvent } from '@/logic/moveable'
import { toggleFullscreen, switchSettingDrawerVisible, globalState, localConfig, localState } from '@/logic/store'
import { imageState, imageLocalState, getImageUrlFromName } from '@/logic/image'
import { downloadImageByUrl } from '@/logic/util'
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
  const isDownloadVisible = !isDragMode.value && localConfig.general.isBackgroundImageEnabled
  const targetLabel = isHoverWidget ? window.$t(`setting.${state.currTargetCode}`) : window.$t('setting.general')
  const list = [
    {
      label: targetLabel + window.$t('common.setting'),
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
  ]
  if (isFocusMode) {
    list.push({ label: window.$t('rightMenu.editFocusMode'), key: 'editFocusMode', icon: renderIconFunc('mdi:tune'), disabled: isDragMode.value })
  }
  list.push({ label: `${globalState.isFullScreen ? window.$t('common.exit') : ''}${window.$t('rightMenu.fullscreen')}`, key: 'fullscreen', icon: renderIconFunc(ICONS.fullscreen) })
  if (isDownloadVisible) {
    list.push({ label: window.$t('rightMenu.downloadWallpaper'), key: 'downloadWallpaper', icon: renderIconFunc(ICONS.downloadFill) })
  }
  if (!isFocusMode) {
    list.push(
      { type: 'divider', key: 'd2' },
      { label: window.$t('setting.aboutSponsor'), key: 'aboutSponsor', icon: renderIconFunc(ICONS.sponsor) },
    )
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
  downloadWallpaper: async () => {
    if (!localConfig.general.isBackgroundImageEnabled) {
      return
    }
    try {
      if (localConfig.general.backgroundImageSource === 0) {
        const objectUrl = imageState.currBackgroundImageFileObjectURL
        const filename = imageState.currBackgroundImageFileName || 'wallpaper.jpg'
        if (!objectUrl) {
          return
        }
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = filename
        link.click()
      } else {
        const quality: TImage.quality = localConfig.general.backgroundImageHighQuality ? 'high' : 'medium'
        const appearanceCode = localState.value.currAppearanceCode
        let url = ''
        if (localConfig.general.backgroundImageSource === 1) {
          if (localConfig.general.isBackgroundImageCustomUrlEnabled) {
            url = localConfig.general.backgroundImageCustomUrls[appearanceCode]
          } else {
            const name = localConfig.general.backgroundImageNames && localConfig.general.backgroundImageNames[appearanceCode]
            url = getImageUrlFromName(
              localConfig.general.backgroundNetworkSourceType,
              name,
              quality,
            )
          }
        } else if (localConfig.general.backgroundImageSource === 2) {
          const todayImage = imageLocalState.value.bing.list[0]
          const name = todayImage && todayImage.name
          url = name ? getImageUrlFromName(1, name, quality) : ''
        }
        if (!url) {
          return
        }
        let filename = 'wallpaper.jpg'
        try {
          const u = new URL(url)
          const idParam = u.searchParams.get('id')
          if (idParam) {
            filename = idParam
          } else {
            const pathName = u.pathname.split('/').pop() || ''
            filename = pathName.split('?')[0] || 'wallpaper.jpg'
          }
        } catch (e) {
          // noop
        }
        await downloadImageByUrl(url, filename)
      }
      gaProxy('click', ['rightMenu', 'downloadWallpaper'])
    } catch (e) {
      // noop
    }
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
