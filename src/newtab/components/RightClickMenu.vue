<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { gaProxy } from '@/logic/gtag'
import { createTab } from '@/logic/util'
import { URL_NAIVETAB_DOC_HOME, URL_FEEDBACK_EMAIL, URL_GITHUB_ISSUSE } from '@/logic/const'
import { openUserGuide } from '@/logic/guide'
import { isDragMode, toggleIsDragMode, getTargetDataFromEvent } from '@/logic/moveable'
import { toggleFullscreen, switchSettingDrawerVisible, globalState, openChangelogModal, openSponsorModal, openExtensionsStorePage } from '@/logic/store'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  currComponentName: '',
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
      label: window.$t('rightMenu.buyACupOfCoffee'),
      key: 'buyACupOfCoffee',
      icon: renderIconFunc('ci:coffee-togo'),
    },
    {
      label: window.$t('rightMenu.userHelp'),
      key: 'userHelp',
      icon: renderIconFunc('ic:baseline-help-outline'),
      children: [
        {
          label: window.$t('rightMenu.userGuide'),
          key: 'userGuide',
          icon: renderIconFunc('material-symbols:developer-guide-outline-rounded'),
        },
        {
          label: window.$t('rightMenu.userDocs'),
          key: 'userDocs',
          icon: renderIconFunc('material-symbols:book-2-outline'),
        },
        {
          label: window.$t('rightMenu.changelog'),
          key: 'changelog',
          icon: renderIconFunc('ic:outline-new-releases'),
        },
      ],
    },
    {
      label: window.$t('rightMenu.feedback'),
      key: 'feedback',
      icon: renderIconFunc('bx:message-rounded-dots'),
      children: [
        {
          label: 'GitHub',
          key: 'feedbackGithub',
          icon: renderIconFunc('carbon:logo-github'),
        },
        {
          label: 'Email',
          key: 'feedbackEmail',
          icon: renderIconFunc('mdi:email-outline'),
        },
        {
          label: window.$t('rightMenu.goodReview'),
          key: 'goodReview',
          icon: renderIconFunc('ph:thumbs-up-bold'),
        },
      ],
    },
  ]
  return resList
})

const menuActionMap = {
  setting: () => {
    let settingDrawerTabName = state.currComponentName
    // 时钟、日期的设置均在同一tab页内
    if (['clockDigital', 'clockAnalog', 'date'].includes(settingDrawerTabName)) {
      settingDrawerTabName = 'clockDate'
    }
    const tabValue = settingDrawerTabName.length === 0 ? 'general' : settingDrawerTabName
    globalState.currSettingTabValue = tabValue
    switchSettingDrawerVisible(true)
    gaProxy('click', ['rightMenu', tabValue])
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
  userDocs: () => {
    createTab(URL_NAIVETAB_DOC_HOME)
    gaProxy('click', ['rightMenu', 'userDocs'])
  },
  userGuide: () => {
    openUserGuide()
    gaProxy('click', ['rightMenu', 'userGuide'])
  },
  changelog: () => {
    openChangelogModal()
    gaProxy('click', ['rightMenu', 'changelog'])
  },
  feedbackGithub: () => {
    createTab(URL_GITHUB_ISSUSE)
    gaProxy('click', ['rightMenu', 'feedbackGithub'])
  },
  feedbackEmail: () => {
    createTab(URL_FEEDBACK_EMAIL)
    gaProxy('click', ['rightMenu', 'feedbackEmail'])
  },
  goodReview: () => {
    openExtensionsStorePage()
    gaProxy('click', ['rightMenu', 'goodReview'])
  },
  buyACupOfCoffee: () => {
    openSponsorModal()
    gaProxy('click', ['rightMenu', 'buyACupOfCoffee'])
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
  state.currComponentName = targetData.name
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
