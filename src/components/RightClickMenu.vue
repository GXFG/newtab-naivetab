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
import { globalState, isDragMode, toggleIsDragMode, toggleIsSettingDrawVisible } from '@/logic'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  menuList: [] as any,
})

const menuActionMap = {
  setting: () => toggleIsSettingDrawVisible(),
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
  await nextTick()
  state.posX = e.clientX
  state.posY = e.clientY
  state.isMenuVisible = true
}

document.oncontextmenu = handleContextMenu

const initEnumData = () => {
  state.menuList = [
    {
      label: window.$t('common.setting'),
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
</script>