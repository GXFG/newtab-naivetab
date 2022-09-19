<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { isEdge } from '@/env'
import {
  URL_FEEDBACK,
  URL_GITHUB_ISSUSE,
  URL_CHROME_STORE,
  URL_EDGE_STORE,
  isDragMode,
  toggleIsDragMode,
  switchSettingDrawerVisible,
  getTargetDataFromEvent,
  globalState,
  createTab,
  openUserGuideModal,
  openWhatsNewModal,
  openSponsorModal,
} from '@/logic'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  currComponentName: '',
})

const renderIconFunc = (icon: string) => () => h(Icon, { icon })

const menuList = computed(() => [
  {
    label:
      (state.currComponentName.length === 0 ? window.$t('setting.general') : window.$t(`setting.${state.currComponentName}`))
      + window.$t('common.setting'),
    key: 'setting',
    icon: renderIconFunc('ion:settings-outline'),
    disabled: isDragMode.value,
  },
  {
    label: isDragMode.value ? `${window.$t('common.exit')}${window.$t('common.dragMode')}` : window.$t('common.dragMode'),
    key: 'dragMode',
    icon: renderIconFunc('tabler:drag-drop'),
  },
  {
    type: 'divider',
    key: 'd1',
  },
  {
    label: window.$t('common.help'),
    key: 'help',
    icon: renderIconFunc('ph:info-bold'),
    children: [
      {
        label: window.$t('common.userGuide'),
        key: 'userGuide',
        icon: renderIconFunc('ic:baseline-help-outline'),
      },
      {
        label: window.$t('common.whatsNew'),
        key: 'whatsNew',
        icon: renderIconFunc('ic:outline-new-releases'),
      },
    ],
  },
  {
    label: window.$t('common.other'),
    key: 'other',
    icon: renderIconFunc('ph:heart-bold'),
    children: [
      {
        label: window.$t('common.feedback'),
        key: 'feedback',
        icon: renderIconFunc('bx:message-rounded-dots'),
        children: [
          {
            label: 'Github',
            key: 'feedbackGithub',
            icon: renderIconFunc('carbon:logo-github'),
          },
          {
            label: 'Email',
            key: 'feedbackEmail',
            icon: renderIconFunc('mdi:email-outline'),
          },
        ],
      },
      {
        label: window.$t('rightMenu.positiveFeedback'),
        key: 'positiveFeedback',
        icon: renderIconFunc('ph:thumbs-up-bold'),
      },
      {
        label: window.$t('rightMenu.buyMeACoffee'),
        key: 'buyMeACoffee',
        icon: renderIconFunc('ep:coffee'),
      },
    ],
  },
])

const menuActionMap = {
  setting: () => {
    let settingDrawerTabName = state.currComponentName
    // 时钟的设置均在同一tab页内
    if (settingDrawerTabName.includes('clock')) {
      settingDrawerTabName = 'clock'
    }
    globalState.currSettingTabValue = settingDrawerTabName.length === 0 ? 'general' : settingDrawerTabName
    switchSettingDrawerVisible(true)
  },
  dragMode: () => {
    switchSettingDrawerVisible(false)
    toggleIsDragMode()
  },
  userGuide: () => {
    openUserGuideModal()
  },
  whatsNew: () => {
    openWhatsNewModal()
  },
  feedbackGithub: () => {
    createTab(URL_GITHUB_ISSUSE)
  },
  feedbackEmail: () => {
    createTab(URL_FEEDBACK)
  },
  positiveFeedback: () => {
    createTab(isEdge ? URL_EDGE_STORE : URL_CHROME_STORE)
  },
  buyMeACoffee: () => {
    openSponsorModal()
  },
}

const onSelectMenu = (key: string) => {
  state.isMenuVisible = false
  const action = menuActionMap[key]
  if (action) {
    action()
  }
}

const onCloseMenu = () => {
  state.isMenuVisible = false
}

const handleContextMenu = async (e: MouseEvent) => {
  e.preventDefault()
  if (globalState.isSettingDrawerVisible) {
    return
  }
  state.isMenuVisible = false
  state.posX = e.clientX
  state.posY = e.clientY
  const targetData = getTargetDataFromEvent(e)
  state.currComponentName = targetData.name
  await nextTick()
  state.isMenuVisible = true
}

document.oncontextmenu = handleContextMenu
</script>

<template>
  <NDropdown
    placement="bottom-start"
    trigger="manual"
    :x="state.posX"
    :y="state.posY"
    :options="menuList"
    :show="state.isMenuVisible"
    :on-clickoutside="onCloseMenu"
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
