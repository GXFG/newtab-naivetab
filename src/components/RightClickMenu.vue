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

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { URL_GITHUB_ISSUSE, isDragMode, toggleIsDragMode, isSettingDrawerVisible, toggleIsSettingDrawerVisible, getTargetDataFromEvent, globalState, createTab, openHelpModal, openWhatsNewModal } from '@/logic'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  currComponentName: '',
})

const menuList = computed(() => [
  {
    label: (state.currComponentName.length === 0 ? window.$t('setting.general') : window.$t(`setting.${state.currComponentName}`)) + window.$t('common.setting'),
    key: 'setting',
    icon: () => h(Icon, { icon: 'ion:settings-outline' }),
    disabled: isDragMode.value,
  },
  {
    label: isDragMode.value ? `${window.$t('common.exit')}${window.$t('common.dragMode')}` : window.$t('common.dragMode'),
    key: 'dragMode',
    icon: () => h(Icon, { icon: 'tabler:drag-drop' }),
  },
  {
    type: 'divider',
    key: 'd1',
  },
  {
    label: window.$t('common.other'),
    key: 'other',
    icon: () => h(Icon, { icon: 'ph:info-bold' }),
    children: [
      {
        label: window.$t('common.usingHelp'),
        key: 'help',
        icon: () => h(Icon, { icon: 'ic:baseline-help-outline' }),
      },
      {
        label: window.$t('common.whatsNew'),
        key: 'whatsNew',
        icon: () => h(Icon, { icon: 'ic:outline-new-releases' }),
      },
    ],
  },
  {
    label: window.$t('common.feedback'),
    key: 'feedback',
    icon: () => h(Icon, { icon: 'bx:message-rounded-dots' }),
    children: [
      {
        label: 'Github',
        key: 'feedbackGithub',
        icon: () => h(Icon, { icon: 'carbon:logo-github' }),
      },
      {
        label: 'Email',
        key: 'feedbackEmail',
        icon: () => h(Icon, { icon: 'mdi:email-outline' }),
      },
    ],
  },
])

const menuActionMap = {
  setting: () => {
    let tabName = state.currComponentName
    if (tabName.includes('clock')) {
      tabName = 'clock'
    }
    globalState.currSettingTabValue = tabName.length === 0 ? 'general' : tabName
    toggleIsSettingDrawerVisible()
  },
  dragMode: () => {
    toggleIsSettingDrawerVisible(false)
    toggleIsDragMode()
  },
  help: () => {
    openHelpModal()
  },
  whatsNew: () => {
    openWhatsNewModal()
  },
  feedbackGithub: () => {
    createTab(URL_GITHUB_ISSUSE)
  },
  feedbackEmail: () => {
    const a = document.createElement('a')
    a.href = 'mailto:gxfgim@outlook.com?subject=NaiveTab Feedback'
    a.click()
  },
}

const onSelectMenu = (key: string) => {
  state.isMenuVisible = false
  const action = menuActionMap[key]
  action && action()
}

const onCloseMenu = () => {
  state.isMenuVisible = false
}

const handleContextMenu = async(e: MouseEvent) => {
  e.preventDefault()
  if (isSettingDrawerVisible.value) {
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

<style>
.n-dropdown-menu {
  user-select: none;
}
</style>
