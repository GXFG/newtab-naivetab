<template>
  <div class="moveable-tool" :class="{ 'moveable-tool--active': isDragMode && isElementDrawerVisible }" @mouseenter="handleContainerMouseEnter" @mouseleave="handleContainerMouseLeave">
    <!-- drawer -->
    <div class="tool__drawer">
      <div v-if="isDragMode" class="drawer__switch" @click="handleToggleIsElementDrawerVisible()">
        <ic:baseline-chevron-right class="switch__icon" :class="{ 'switch__icon--active': isElementDrawerVisible }" />
      </div>
      <div class="drawer__header">
        <NButton ghost type="warning" @click="toggleIsDragMode()">
          <mdi:exit-to-app class="header__icon" />&nbsp;{{ `${$t('common.exit')}${$t('common.dragMode')}` }}
        </NButton>
      </div>
      <div class="drawer__content">
        <div v-for="item in componentList" :key="item.label" data-target-type="2" data-target-name="element">
          <div v-if="!item.disabled" class="content__item" draggable="true">
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
    <!-- delete -->
    <div
      v-if="isDeleteBtnVisible"
      class="tool__delete"
      :class="{ 'tool__delete--active': state.isDeleteHover }"
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
import { isDragMode, toggleIsDragMode, isElementDrawerVisible, handleToggleIsElementDrawerVisible, addKeyboardTask, currDragTargetName, getStyleConst, moveState, globalState, changeElementEnabledStatus } from '@/logic'

const state = reactive({
  isDeleteHover: false,
})

const componentList = computed(() => [
  { label: 'KeyboardBookmark', componentName: 'bookmark', disabled: globalState.setting.bookmark.enabled },
  { label: 'DigitalClock', componentName: 'clockDigital', disabled: globalState.setting.clockDigital.enabled },
  { label: 'AnalogClock', componentName: 'clockAnalog', disabled: globalState.setting.clockAnalog.enabled },
  { label: 'Date', componentName: 'date', disabled: globalState.setting.date.enabled },
  { label: 'Calendar', componentName: 'calendar', disabled: globalState.setting.calendar.enabled },
  { label: 'Search', componentName: 'search', disabled: globalState.setting.search.enabled },
  { label: 'Weather', componentName: 'weather', disabled: globalState.setting.weather.enabled },
  { label: 'Setting', componentName: 'settingIcon', disabled: globalState.setting.settingIcon.enabled },
])

const handleContainerMouseEnter = () => {
  // console.log('handleContainerMouseEnter')
}

const handleContainerMouseLeave = () => {
  // console.log('handleContainerMouseLeave')
}

const handleElementMouseDown = () => {
  console.log('handleElementMouseDown')
}

const handleElementMouseMove = () => {
  console.log('handleElementMouseMove')
  // currDragTargetName.value = componentName
  // globalState.state.dragTempEnabled[currDragTargetName.value] = true
}

const handleElementMouseUp = () => {
  console.log('handleElementMouseUp')
  // globalState.state.dragTempEnabled[currDragTargetName.value] = false
  // currDragTargetName.value = ''
}

const initDrag = () => {
  moveState.MouseDownTaskMap.set('element', handleElementMouseDown)
  moveState.MouseMoveTaskMap.set('element', handleElementMouseMove)
  moveState.MouseUpTaskMap.set('element', handleElementMouseUp)
}

initDrag()

const isDeleteBtnVisible = computed(() => isDragMode.value && moveState.isComponentDraging)

const onDeleteComponent = () => {
  globalState.setting[currDragTargetName.value].enabled = false
}

const handlerDeleteMouseEnter = () => {
  if (!moveState.isComponentDraging) {
    return
  }
  state.isDeleteHover = true
}

const handlerDeleteMouseLeave = () => {
  if (!moveState.isComponentDraging) {
    return
  }
  state.isDeleteHover = false
}

const handlerDeleteMouseUp = () => {
  if (!moveState.isComponentDraging) {
    return
  }
  onDeleteComponent()
  state.isDeleteHover = false
}

const keyboardHandler = (e: KeyboardEvent) => {
  if (!isDragMode.value) {
    return
  }
  const { key } = e
  if (key === 'Escape') {
    toggleIsDragMode()
  } else if (['Delete', 'Backspace'].includes(key)) {
    if (currDragTargetName.value.length === 0) {
      return
    }
    changeElementEnabledStatus(currDragTargetName.value as TComponents, false)
  }
}

const CNAME = 'moveable-tool'
addKeyboardTask(CNAME, keyboardHandler)

const deleteColorMain = getStyleConst('deleteColorMain')
const deleteColorActive = getStyleConst('deleteColorActive')
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
      .content__item {
        padding: 10px;
        text-align: center;
        cursor: pointer;
      }
    }
  }
  .tool__delete {
    z-index: 11;
    position: fixed;
    top: 2vh;
    right: 2vw;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    border: 1px solid v-bind(deleteColorMain);
    border-radius: 2px;
    .delete__icon {
      font-size: 30px;
      color: v-bind(deleteColorMain);
    }
  }
  .tool__delete--active {
    background-color: v-bind(deleteColorActive);
  }
}
.moveable-tool--active {
  left: 0 !important;
}
</style>
