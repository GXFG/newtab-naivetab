<template>
  <div class="moveable-tool" :class="{ 'moveable-tool--active': isDragMode && isElementDrawerVisible }" @mouseenter="handleContainerMouseEnter" @mouseleave="handleContainerMouseLeave">
    <!-- drawer -->
    <div class="tool__drawer">
      <div v-if="isDragMode" class="drawer__switch" @click="handleToggleIsElementDrawerVisible()">
        <ic:baseline-chevron-right class="switch__icon" :class="{ 'switch__icon--active': isElementDrawerVisible }" />
      </div>
      <div class="drawer__header">
        <NButton ghost type="warning" @click="toggleIsDragMode()">
          <mdi:keyboard-esc class="header__icon" />&nbsp;{{ `${$t('common.exit')}${$t('common.dragMode')}` }}
        </NButton>
      </div>
      <div class="drawer__content">
        <div
          v-for="item in componentList"
          v-show="!item.disabled"
          :key="item.label"
          data-target-type="2"
          :data-target-name="item.componentName"
          class="content__item"
        >
          <!-- draggable="true" -->
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>
    <!-- delete -->
    <div
      v-if="isDeleteBtnVisible"
      class="tool__delete"
      @mouseenter="handlerDeleteMouseEnter"
      @mouseleave="handlerDeleteMouseLeave"
      @mouseup="handlerDeleteMouseUp"
    >
      <ri:delete-bin-6-line class="delete__icon" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { isDragMode, toggleIsDragMode, isElementDrawerVisible, handleToggleIsElementDrawerVisible, addKeyboardTask, getStyleConst, moveState, globalState, changeElementEnabledStatus } from '@/logic'

const state = reactive({
  isInDrawer: false,
})

const componentList = computed(() => [
  { label: 'SettingIcon', componentName: 'settingIcon', disabled: globalState.setting.settingIcon.enabled },
  { label: 'KeyboardBookmark', componentName: 'bookmark', disabled: globalState.setting.bookmark.enabled },
  { label: 'DigitalClock', componentName: 'clockDigital', disabled: globalState.setting.clockDigital.enabled },
  { label: 'AnalogClock', componentName: 'clockAnalog', disabled: globalState.setting.clockAnalog.enabled },
  { label: 'Date', componentName: 'date', disabled: globalState.setting.date.enabled },
  { label: 'Calendar', componentName: 'calendar', disabled: globalState.setting.calendar.enabled },
  { label: 'Search', componentName: 'search', disabled: globalState.setting.search.enabled },
  { label: 'Weather', componentName: 'weather', disabled: globalState.setting.weather.enabled },
])

const handleContainerMouseEnter = () => {
  state.isInDrawer = true
}
const handleContainerMouseLeave = () => {
  state.isInDrawer = false
}

const handleElementMouseDown = () => {

}

let isRunStartDragTask = false
const handleElementMouseMove = async(e: MouseEvent) => {
  if (isRunStartDragTask || state.isInDrawer) {
    return
  }
  isRunStartDragTask = true
  moveState.dragTempEnabledMap[moveState.currDragTarget.name] = true
  await nextTick()
  moveState.MouseDownTaskMap.get(moveState.currDragTarget.name)(e, true)
}

const handleElementMouseUp = (e: MouseEvent) => {
  moveState.MouseUpTaskMap.get(moveState.currDragTarget.name)(e)
  if (!state.isInDrawer) {
    // save
    globalState.setting[moveState.currDragTarget.name].enabled = true
  }
  moveState.dragTempEnabledMap[moveState.currDragTarget.name] = false
  isRunStartDragTask = false
}

const initMouseTask = () => {
  moveState.MouseDownTaskMap.set('element', handleElementMouseDown)
  moveState.MouseMoveTaskMap.set('element', handleElementMouseMove)
  moveState.MouseUpTaskMap.set('element', handleElementMouseUp)
}

onMounted(() => {
  initMouseTask()
})

// delete
const isDeleteBtnVisible = computed(() => isDragMode.value && moveState.isComponentDraging)

const onDeleteComponent = () => {
  globalState.setting[moveState.currDragTarget.name].enabled = false
}

const handlerDeleteMouseEnter = () => {
  if (!moveState.isComponentDraging) {
    return
  }
  moveState.isDeleteHover = true
}

const handlerDeleteMouseLeave = () => {
  if (!moveState.isComponentDraging) {
    return
  }
  moveState.isDeleteHover = false
}

const handlerDeleteMouseUp = () => {
  if (!moveState.isComponentDraging) {
    return
  }
  onDeleteComponent()
  moveState.isDeleteHover = false
}

// keyboard
const keyboardHandler = (e: KeyboardEvent) => {
  if (!isDragMode.value) {
    return
  }
  const { key } = e
  if (key === 'Escape') {
    toggleIsDragMode()
    return
  }
  if (['Delete', 'Backspace'].includes(key)) {
    if (moveState.currDragTarget.name.length === 0) {
      return
    }
    changeElementEnabledStatus(moveState.currDragTarget.name as TComponents, false)
  }
}

const CNAME = 'moveable-tool'
addKeyboardTask(CNAME, keyboardHandler)

const bgMoveableElementDelete = getStyleConst('bgMoveableElementDelete')
</script>

<style>
.moveable-tool {
  z-index: 11;
  position: relative;
  top: 0;
  left: -250px;
  width: 250px;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  transition: all 0.3s ease;
  .tool__drawer {
    display: flex;
    flex-direction: column;
    align-items: center;
    .drawer__switch {
      position: absolute;
      top: 50vh;
      right: -20px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 20px;
      height: 80px;
      transform: translate(0, -50%);
      background-color: rgba(0, 0, 0, 0.7);
      border-top-right-radius: 5px;
      border-bottom-right-radius: 5px;
      cursor: pointer;
      .switch__icon {
        flex: 0 0 auto;
        font-size: 24px;
        transition: all 0.1s ease;
      }
      .switch__icon--active {
        transform: rotate(180deg);
      }
    }
    .drawer__header {
      padding: 10px;
      .header__icon {
        font-size: 16px;
      }
    }
    .drawer__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      .content__item {
        width: 100%;
        margin: 0 10px;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        user-select: none;
      }
    }
  }
  .tool__delete {
    z-index: 11;
    position: fixed;
    top: 2vh;
    right: 5vw;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 45px;
    height: 45px;
    border: 1px solid v-bind(bgMoveableElementDelete);
    border-radius: 2px;
    cursor: pointer;
    .delete__icon {
      font-size: 30px;
      color: v-bind(bgMoveableElementDelete);
    }
  }
}
.moveable-tool--active {
  left: 0 !important;
}
</style>
