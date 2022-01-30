<template>
  <div
    id="moveable-tool"
    :class="{ 'moveable-tool--active': isDragMode && isElementDrawerVisible }"
    @mouseenter="handleContainerMouseEnter"
    @mouseleave="handleContainerMouseLeave"
  >
    <!-- drawer -->
    <div class="tool__drawer">
      <div v-if="isDragMode" class="drawer__switch" @click="handleToggleIsElementDrawerVisible()">
        <ic:baseline-chevron-right class="switch__icon" :class="{ 'switch__icon--active': isElementDrawerVisible }" />
      </div>
      <div class="drawer__header">
        <NButton ghost type="warning" @click="toggleIsDragMode()">
          <mdi:keyboard-esc class="header__icon" />&nbsp;{{ `${$t('common.exit')}` }}
        </NButton>
      </div>
      <div class="drawer__content">
        <div
          v-for="item in elementList"
          v-show="!item.disabled"
          :key="item.label"
          class="content__item"
          data-target-type="2"
          :data-target-name="item.componentName"
        >
          <div class="item__icon" :style="`font-size:${item.iconSize}px`">
            <Icon :icon="item.iconName" />
          </div>
          <span class="item__text">{{ item.label }}</span>
        </div>
      </div>
    </div>
    <!-- delete -->
    <div
      class="tool__delete"
      :class="{ 'tool__delete--active': isDeleteBtnVisible }"
      @mouseenter="handlerDeleteMouseEnter"
      @mouseleave="handlerDeleteMouseLeave"
      @mouseup="handlerDeleteMouseUp"
    >
      <ri:delete-bin-6-line class="delete__icon" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import {
  isDragMode,
  toggleIsDragMode,
  isElementDrawerVisible,
  handleToggleIsElementDrawerVisible,
  addKeyboardTask,
  getStyleConst,
  moveState,
  localState,
} from '@/logic'

const state = reactive({
  isCursorInElementDrawer: false,
})

const elementList = computed(() => [
  {
    label: window.$t('setting.mainLabel'),
    componentName: 'settingIcon',
    iconName: 'ic:baseline-settings',
    iconSize: 26,
    disabled: localState.setting.settingIcon.enabled,
  },
  {
    label: window.$t('setting.bookmark'),
    componentName: 'bookmark',
    iconName: 'ic:outline-keyboard-alt',
    iconSize: 28,
    disabled: localState.setting.bookmark.enabled,
  },
  {
    label: window.$t('setting.clockDigital'),
    componentName: 'clockDigital',
    iconName: 'mdi:clock-digital',
    iconSize: 30,
    disabled: localState.setting.clockDigital.enabled,
  },
  {
    label: window.$t('setting.clockAnalog'),
    componentName: 'clockAnalog',
    iconName: 'grommet-icons:clock',
    iconSize: 26,
    disabled: localState.setting.clockAnalog.enabled,
  },
  {
    label: window.$t('setting.date'),
    componentName: 'date',
    iconName: 'system-uicons:calendar-date',
    iconSize: 26,
    disabled: localState.setting.date.enabled,
  },
  {
    label: window.$t('setting.calendar'),
    componentName: 'calendar',
    iconName: 'uiw:date',
    iconSize: 22,
    disabled: localState.setting.calendar.enabled,
  },
  {
    label: window.$t('setting.search'),
    componentName: 'search',
    iconName: 'teenyicons:search-circle-outline',
    iconSize: 24,
    disabled: localState.setting.search.enabled,
  },
  {
    label: window.$t('setting.weather'),
    componentName: 'weather',
    iconName: 'mdi:weather-cloudy',
    iconSize: 28,
    disabled: localState.setting.weather.enabled,
  },
  {
    label: window.$t('setting.memo'),
    componentName: 'memo',
    iconName: 'fluent:notepad-edit-16-regular',
    iconSize: 24,
    disabled: localState.setting.memo.enabled,
  },
])

// ElementDrawer
const handleContainerMouseEnter = () => {
  state.isCursorInElementDrawer = true
}
const handleContainerMouseLeave = () => {
  state.isCursorInElementDrawer = false
}

// Element
let isStartDragTaskRan = false
const handleElementMouseDown = () => {
  isStartDragTaskRan = false
}

const handleElementMouseMove = async(e: MouseEvent) => {
  if (isStartDragTaskRan) {
    // 确保MouseDownTaskMap只执行一次
    return
  }
  isStartDragTaskRan = true
  moveState.dragTempEnabledMap[moveState.currDragTarget.name] = true
  await nextTick()
  moveState.MouseDownTaskMap.get(moveState.currDragTarget.name)(e, true)
}

const handleElementMouseUp = (e: MouseEvent) => {
  moveState.MouseUpTaskMap.get(moveState.currDragTarget.name)(e)
  if (!state.isCursorInElementDrawer) {
    // 保存启用状态
    localState.setting[moveState.currDragTarget.name].enabled = true
  }
  moveState.dragTempEnabledMap[moveState.currDragTarget.name] = false
  isStartDragTaskRan = false
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
  localState.setting[moveState.currDragTarget.name].enabled = false
  moveState.dragTempEnabledMap[moveState.currDragTarget.name] = false
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

// keyboard listener
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
    onDeleteComponent()
  }
}

const CNAME = 'moveable-tool'
addKeyboardTask(CNAME, keyboardHandler)

const themeColorMain = getStyleConst('themeColorMain')
const bgMoveableComponentMain = getStyleConst('bgMoveableComponentMain')
const bgMoveableComponentDelete = getStyleConst('bgMoveableComponentDelete')
const bgMoveableToolDrawer = getStyleConst('bgMoveableToolDrawer')
const borderMoveableToolItem = getStyleConst('borderMoveableToolItem')
</script>

<style>
#moveable-tool {
  z-index: 20;
  position: relative;
  top: 0;
  left: -230px;
  width: 230px;
  height: 100vh;
  color: #fff;
  background-color: v-bind(bgMoveableToolDrawer);
  transition: all 0.3s ease;
  .tool__drawer {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100vh;
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
      background-color: v-bind(bgMoveableToolDrawer);
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
    .drawer__switch:hover {
      color: v-bind(themeColorMain);
    }
    .drawer__header {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      width: 100%;
      border-bottom: 1px solid v-bind(borderMoveableToolItem);
      .header__icon {
        font-size: 22px;
      }
    }
    .drawer__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-top: 10px;
      width: 100%;
      .content__item {
        flex-shrink: 1;
        display: flex;
        align-items: center;
        margin: 10px 0;
        width: 75%;
        height: 45px;
        font-size: 16px;
        /* text-align: center; */
        border: 1px solid v-bind(borderMoveableToolItem);
        border-radius: 3px;
        cursor: move;
        user-select: none;
        .item__icon {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 50px;
          height: 45px;
        }
        .item__text {
          flex: 1;
          height: 45px;
          line-height: 45px;
          text-align: center;
          border-left: 1px solid v-bind(borderMoveableToolItem);
        }
      }
      .content__item:hover {
        background-color: v-bind(bgMoveableComponentMain);
      }
    }
  }
  .tool__delete {
    z-index: 20;
    position: fixed;
    top: -45px;
    right: -45px;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 45px;
    height: 45px;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.3s ease;
    .delete__icon {
      font-size: 36px;
      color: v-bind(bgMoveableComponentDelete);
    }
  }
  .tool__delete--active {
    top: 8vh;
    right: 10vw;
  }
}
.moveable-tool--active {
  left: 0 !important;
}
</style>
