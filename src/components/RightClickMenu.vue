<template>
  <n-dropdown
    placement="bottom-start"
    trigger="manual"
    :x="state.posX"
    :y="state.posY"
    :options="state.menuList"
    :show="state.isMenuVisible"
    :on-clickoutside="onCloseMenu"
    @select="onSelectMenu"
  />
</template>

<script setup lang="ts">
import { globalState, isDragMode, toggleIsDragMode, toggleIsSettingDrawerVisible, currSettingTabValue, getTargetDataFromEvent } from '@/logic'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  menuList: [] as any,
  currComponentName: '',
})

const initEnumData = () => {
  state.menuList = [
    {
      label: (state.currComponentName.length === 0 ? '' : window.$t(`setting.${state.currComponentName}`)) + window.$t('common.setting'),
      key: 'setting',
      disabled: isDragMode,
    },
    {
      type: 'divider',
      key: 'd1',
    },
    {
      label: window.$t('common.dragMode'),
      key: 'dragMode',
    },
  ]
}

watch(
  () => globalState.setting.general.lang,
  () => {
    initEnumData()
  },
  { immediate: true },
)

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
  dragMode: () => toggleIsDragMode(),
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
  state.isMenuVisible = false
  state.posX = e.clientX
  state.posY = e.clientY
  const targetData = getTargetDataFromEvent(e)
  state.currComponentName = targetData.name
  initEnumData()
  await nextTick()
  state.isMenuVisible = true
}

document.oncontextmenu = handleContextMenu
</script>
