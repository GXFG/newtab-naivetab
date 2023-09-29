<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { gaProxy } from '@/logic/gtag'
import { addKeydownTask } from '@/logic/task'
import { isDragMode, toggleIsDragMode, isElementDrawerVisible, handleToggleIsElementDrawerVisible, moveState } from '@/logic/moveable'
import { getStyleConst, getStyleField, localConfig, globalState } from '@/logic/store'

const state = reactive({
  isCursorInElementDrawer: false,
})

const elementList = computed(() => [
  {
    label: window.$t('setting.clockDigital'),
    componentName: 'clockDigital',
    iconName: 'mdi:clock-digital',
    iconSize: 50,
    disabled: localConfig.clockDigital.enabled,
  },
  {
    label: window.$t('setting.clockAnalog'),
    componentName: 'clockAnalog',
    iconName: 'grommet-icons:clock',
    iconSize: 30,
    disabled: localConfig.clockAnalog.enabled,
  },
  {
    label: window.$t('setting.date'),
    componentName: 'date',
    iconName: 'system-uicons:calendar-date',
    iconSize: 35,
    disabled: localConfig.date.enabled,
  },
  {
    label: window.$t('setting.calendar'),
    componentName: 'calendar',
    iconName: 'uiw:date',
    iconSize: 30,
    disabled: localConfig.calendar.enabled,
  },
  {
    label: window.$t('setting.search'),
    componentName: 'search',
    iconName: 'fluent:search-square-24-regular',
    iconSize: 40,
    disabled: localConfig.search.enabled,
  },
  {
    label: window.$t('setting.memo'),
    componentName: 'memo',
    iconName: 'material-symbols:note-alt-outline',
    iconSize: 35,
    disabled: localConfig.memo.enabled,
  },
  {
    label: window.$t('setting.weather'),
    componentName: 'weather',
    iconName: 'mdi:weather-cloudy',
    iconSize: 35,
    disabled: localConfig.weather.enabled,
  },
  {
    label: window.$t('setting.news'),
    componentName: 'news',
    iconName: 'majesticons:newspaper-line',
    iconSize: 30,
    disabled: localConfig.news.enabled,
  },
  {
    label: window.$t('setting.bookmarkKeyboard'),
    componentName: 'bookmark',
    iconName: 'ic:outline-keyboard-alt',
    iconSize: 35,
    disabled: localConfig.bookmark.enabled,
  },
])

const handleExitDragMode = () => {
  if (globalState.isGuideMode) {
    return
  }
  toggleIsDragMode(false)
}

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
  const mouseDownTask = moveState.MouseDownTaskMap.get(moveState.currDragTarget.name)
  if (mouseDownTask) {
    mouseDownTask(e, true) // startDrag(e: MouseEvent, resite: boolean)
  }
  // 执行一次 onDragging，为消除首次启用组件时会展示上次存储的布局
  const mouseMoveTask = moveState.MouseMoveTaskMap.get(moveState.currDragTarget.name)
  if (mouseMoveTask) {
    mouseMoveTask(e)
  }
}

const handleElementMouseMove = async (e: MouseEvent) => {
  const mouseMoveTask = moveState.MouseMoveTaskMap.get(moveState.currDragTarget.name)
  if (mouseMoveTask) {
    mouseMoveTask(e)
  }
}

const handleElementMouseUp = (e: MouseEvent) => {
  const mouseUpTask = moveState.MouseUpTaskMap.get(moveState.currDragTarget.name)
  if (mouseUpTask) {
    mouseUpTask(e)
  }
  const isEnabled = !state.isCursorInElementDrawer
  localConfig[moveState.currDragTarget.name].enabled = isEnabled
  if (!isEnabled) {
    return
  }
  gaProxy('move', ['element', moveState.currDragTarget.name], {
    enabled: true,
  })
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
  gaProxy('move', ['element', moveState.currDragTarget.name], {
    enabled: false,
  })
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

addKeydownTask('moveable-tool', keyboardHandler)

const customPrimaryColor = getStyleField('general', 'primaryColor')
const bgMoveableComponentMain = getStyleConst('bgMoveableComponentMain')
const bgMoveableComponentDelete = getStyleConst('bgMoveableComponentDelete')
const bgMoveableToolDrawer = getStyleConst('bgMoveableToolDrawer')
const borderMoveableToolItem = getStyleConst('borderMoveableToolItem')
</script>

<template>
  <div
    id="moveable-tool"
    :class="{
      'moveable-tool--active': isDragMode && isElementDrawerVisible,
      'moveable-tool--shadow': isDragMode,
    }"
    @mouseenter="handleElementDrawerMouseEnter"
    @mouseleave="handleElementDrawerMouseLeave"
  >
    <div
      v-if="isDragMode"
      class="tool__drawer"
    >
      <!-- switch button -->
      <div
        class="drawer__switch"
        :class="{ 'drawer__switch--hidden': isElementDrawerVisible }"
        @click="handleToggleIsElementDrawerVisible()"
      >
        <ic:baseline-chevron-right
          class="switch__icon"
          :class="{ 'switch__icon--active': isElementDrawerVisible }"
        />
      </div>

      <div class="drawer__header">
        <NButton
          class="header__exit"
          strong
          secondary
          type="warning"
          @click="handleExitDragMode"
        >
          <mdi:keyboard-esc class="exit__icon" />
          <p>{{ $t('rightMenu.doneEdit') }}</p>
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
          <div
            class="item__icon"
            :style="`font-size: ${item.iconSize}px`"
          >
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
      <tabler:trash
        v-show="!moveState.isDeleteHover"
        class="delete__icon"
      />
      <tabler:trash-x
        v-show="moveState.isDeleteHover"
        class="delete__icon"
      />
    </div>
  </div>
</template>

<style>
.moveable-tool--active {
  left: 0 !important;
}
.moveable-tool--shadow {
  box-shadow: 0 0 10px 3px #272727;
}

#moveable-tool {
  z-index: 20;
  position: relative;
  top: 0;
  left: -360px;
  width: 360px;
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
    /* background-image: radial-gradient(transparent 1px, #000 1px);
    background-size: 4px 4px; */
    .drawer__switch {
      z-index: 30;
      position: absolute;
      top: 28px;
      right: -20px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 20px;
      height: 52px;
      background-color: v-bind(bgMoveableToolDrawer);
      border-top-right-radius: 5px;
      border-bottom-right-radius: 5px;
      transform: translate(0, -50%);
      cursor: pointer;
      .switch__icon {
        flex: 0 0 auto;
        font-size: 24px;
        transition: all 400ms ease-in-out;
      }
      .switch__icon--active {
        transform: rotate(180deg);
      }
    }
    .drawer__switch:hover {
      color: v-bind(customPrimaryColor);
    }
    .drawer__switch--hidden {
      right: 0px !important;
      background-color: transparent;
    }

    .drawer__header {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      width: 100%;
      height: 55px;
      border-bottom: 1px solid v-bind(borderMoveableToolItem);
      .header__exit {
        display: flex;
        align-items: center;
        justify-content: center;
        .exit__icon {
          margin-top: -2px;
          margin-right: 5px;
          font-size: 22px;
        }
      }
    }

    .drawer__content {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      align-content: center;
      padding: 10px 0;
      width: 100%;
      width: 100%;
      .content__item {
        flex-shrink: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: 10px 0 10px 33px;
        width: 130px;
        height: 80px;
        font-size: 14px;
        border: 2px solid v-bind(borderMoveableToolItem);
        border-radius: 5px;
        cursor: move;
        user-select: none;
        .item__icon {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 45px;
        }
        .item__text {
          flex: 1;
          padding-top: 3px;
          height: 20px;
          line-height: 20px;
          text-align: center;
          border-top: 1px solid v-bind(borderMoveableToolItem);
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
    transition: all 300ms ease;
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
