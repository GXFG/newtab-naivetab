<template>
  <n-dropdown
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
import { isDragMode, toggleIsDragMode, isSettingDrawerVisible, toggleIsSettingDrawerVisible, currSettingTabValue, getTargetDataFromEvent } from '@/logic'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  currComponentName: '',
})

const menuList = computed(() => ([
  {
    label: (state.currComponentName.length === 0 ? '' : window.$t(`setting.${state.currComponentName}`)) + window.$t('common.setting'),
    key: 'setting',
    disabled: isDragMode.value,
  },
  {
    type: 'divider',
    key: 'd1',
  },
  {
    label: window.$t('common.dragMode'),
    key: 'dragMode',
  },
]))

const menuActionMap = {
  setting: () => {
    let tabName = state.currComponentName
    if (tabName.includes('clock')) {
      tabName = 'clock'
    }
    if (tabName.length !== 0) {
      currSettingTabValue.value = tabName
    }
    toggleIsSettingDrawerVisible()
  },
  dragMode: () => {
    toggleIsSettingDrawerVisible(false)
    toggleIsDragMode()
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
  state.currComponentName = targetData.name === 'settingIcon' ? '' : targetData.name
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
