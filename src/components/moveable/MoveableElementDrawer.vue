<script setup lang="ts">
import { Icon } from '@iconify/vue'
import {
  isDragMode,
  toggleIsDragMode,
  isElementDrawerVisible,
  handleToggleIsElementDrawerVisible,
  addKeyboardTask,
  getStyleConst,
  getStyleField,
  moveState,
  localConfig,
} from '@/logic'

const state = reactive({
  isCursorInElementDrawer: false,
})

const elementList = computed(() => [
  {
    label: window.$t('setting.bookmarkKeyboard'),
    componentName: 'bookmark',
    iconName: 'ic:outline-keyboard-alt',
    iconSize: 2.8,
    disabled: localConfig.bookmark.enabled,
  },
  {
    label: window.$t('setting.clockDigital'),
    componentName: 'clockDigital',
    iconName: 'mdi:clock-digital',
    iconSize: 3,
    disabled: localConfig.clockDigital.enabled,
  },
  {
    label: window.$t('setting.clockAnalog'),
    componentName: 'clockAnalog',
    iconName: 'grommet-icons:clock',
    iconSize: 2.5,
    disabled: localConfig.clockAnalog.enabled,
  },
  {
    label: window.$t('setting.date'),
    componentName: 'date',
    iconName: 'system-uicons:calendar-date',
    iconSize: 2.6,
    disabled: localConfig.date.enabled,
  },
  {
    label: window.$t('setting.calendar'),
    componentName: 'calendar',
    iconName: 'uiw:date',
    iconSize: 2.2,
    disabled: localConfig.calendar.enabled,
  },
  {
    label: window.$t('setting.search'),
    componentName: 'search',
    iconName: 'fluent:search-square-24-regular',
    iconSize: 2.8,
    disabled: localConfig.search.enabled,
  },
  {
    label: window.$t('setting.memo'),
    componentName: 'memo',
    iconName: 'material-symbols:note-alt-outline',
    iconSize: 2.6,
    disabled: localConfig.memo.enabled,
  },
  {
    label: window.$t('setting.weather'),
    componentName: 'weather',
    iconName: 'mdi:weather-cloudy',
    iconSize: 2.8,
    disabled: localConfig.weather.enabled,
  },
  {
    label: window.$t('setting.news'),
    componentName: 'news',
    iconName: 'majesticons:newspaper-line',
    iconSize: 2.4,
    disabled: localConfig.news.enabled,
  },
])

// ElementDrawer
const handleElementDrawerMouseEnter = () => {
  state.isCursorInElementDrawer = true
}

const handleElementDrawerMouseLeave = () => {
  state.isCursorInElementDrawer = false
}

// Element
const handleElementMouseDown = async (e: MouseEvent) => {
  localConfig[moveState.currDragTarget.name].enabled = true
  await nextTick()
  // 以光标位置为组件的中心开始拖拽
  moveState.MouseDownTaskMap.get(moveState.currDragTarget.name)(e, true) // startDrag(e: MouseEvent, resite: boolean)
  // 执行一次 onDragging，为消除首次启用组件时会展示上次存储的布局
  moveState.MouseMoveTaskMap.get(moveState.currDragTarget.name)(e)
}

const handleElementMouseMove = async (e: MouseEvent) => {
  moveState.MouseMoveTaskMap.get(moveState.currDragTarget.name)(e)
}

const handleElementMouseUp = (e: MouseEvent) => {
  moveState.MouseUpTaskMap.get(moveState.currDragTarget.name)(e)
  const isEnabled = !state.isCursorInElementDrawer
  localConfig[moveState.currDragTarget.name].enabled = isEnabled
}

const initElementMouseTask = () => {
  moveState.MouseDownTaskMap.set('element-general', handleElementMouseDown)
  moveState.MouseMoveTaskMap.set('element-general', handleElementMouseMove)
  moveState.MouseUpTaskMap.set('element-general', handleElementMouseUp)
}

onMounted(() => {
  initElementMouseTask()
})

const onDeleteComponent = () => {
  localConfig[moveState.currDragTarget.name].enabled = false
}

const handlerDeleteMouseEnter = () => {
  moveState.isDeleteHover = true
}

const handlerDeleteMouseLeave = () => {
  moveState.isDeleteHover = false
}

const handlerDeleteMouseUp = () => {
  onDeleteComponent()
  moveState.isDeleteHover = false
}

// keyboard listener
const keyboardHandler = (e: KeyboardEvent) => {
  if (!isDragMode.value) {
    return
  }
  const { code } = e
  if (code === 'Escape') {
    toggleIsDragMode()
    return
  }
  if (['Delete', 'Backspace'].includes(code)) {
    if (moveState.currDragTarget.name.length === 0) {
      return
    }
    onDeleteComponent()
  }
}

addKeyboardTask('moveable-tool', keyboardHandler)

const customPrimaryColor = getStyleField('general', 'primaryColor')
const bgMoveableComponentMain = getStyleConst('bgMoveableComponentMain')
const bgMoveableComponentDelete = getStyleConst('bgMoveableComponentDelete')
const bgMoveableToolDrawer = getStyleConst('bgMoveableToolDrawer')
const borderMoveableToolItem = getStyleConst('borderMoveableToolItem')
</script>

<template>
  <div
    id="moveable-tool"
    :class="{ 'moveable-tool--active': isDragMode && isElementDrawerVisible }"
    @mouseenter="handleElementDrawerMouseEnter"
    @mouseleave="handleElementDrawerMouseLeave"
  >
    <!-- drawer -->
    <div v-if="isDragMode" class="tool__drawer">
      <div class="drawer__switch" @click="handleToggleIsElementDrawerVisible()">
        <ic:baseline-chevron-right class="switch__icon" :class="{ 'switch__icon--active': isElementDrawerVisible }" />
      </div>
      <div class="drawer__header">
        <NButton ghost type="warning" @click="toggleIsDragMode()">
          <mdi:keyboard-esc class="header__icon" />&nbsp;{{ `${$t('common.exit')}${$t('common.dragMode')}` }}
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
          <div class="item__icon" :style="`font-size:${item.iconSize}vmin`">
            <Icon :icon="item.iconName" />
          </div>
          <span class="item__text">{{ item.label }}</span>
        </div>
      </div>
    </div>
    <!-- delete -->
    <div
      v-if="isDragMode"
      class="tool__delete"
      :class="{ 'tool__delete--active': isDragMode && moveState.isComponentDraging }"
      @mouseenter="handlerDeleteMouseEnter"
      @mouseleave="handlerDeleteMouseLeave"
      @mouseup="handlerDeleteMouseUp"
    >
      <tabler:trash v-show="!moveState.isDeleteHover" class="delete__icon" />
      <tabler:trash-x v-show="moveState.isDeleteHover" class="delete__icon" />
    </div>
  </div>
</template>

<style>
.moveable-tool--active {
  left: 0 !important;
}

#moveable-tool {
  z-index: 20;
  position: relative;
  top: 0;
  left: -30vmin;
  width: 30vmin;
  height: 100vh;
  color: #fff;
  background-color: v-bind(bgMoveableToolDrawer);
  transition: all 300ms ease;
  .tool__drawer {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100vh;
    backdrop-filter: saturate(50%) blur(4px);
    /* background-image: radial-gradient(transparent 1px, #000 1px); */
    /* background-size: 4px 4px; */
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
        transition: all 400ms ease;
      }
      .switch__icon--active {
        transform: rotate(180deg);
      }
    }
    .drawer__switch:hover {
      color: v-bind(customPrimaryColor);
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
      width: 100%;
      .content__item {
        flex-shrink: 1;
        display: flex;
        align-items: center;
        margin: 2vmin 0;
        width: 75%;
        height: 6vmin;
        font-size: 1.6vmin;
        border: 1px solid v-bind(borderMoveableToolItem);
        border-radius: 3px;
        cursor: move;
        user-select: none;
        .item__icon {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 6vmin;
          height: 6vmin;
        }
        .item__text {
          flex: 1;
          height: 6vmin;
          line-height: 6vmin;
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
    top: -200px;
    right: -200px;
    width: 200px;
    height: 200px;
    cursor: pointer;
    background-color: v-bind(bgMoveableComponentDelete);
    transition: all 0.3s ease;
    transform: rotate(45deg);
    .delete__icon {
      position: absolute;
      bottom: 20px;
      left: 80px;
      font-size: 36px;
      color: #fff;
      transform: rotate(-45deg);
    }
  }
  .tool__delete--active {
    top: -100px;
    right: -100px;
  }
}
</style>
