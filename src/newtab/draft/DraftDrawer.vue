<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { gaProxy } from '@/logic/gtag'
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { isDragMode, toggleIsDragMode, isDraftDrawerVisible, handleToggleIsDraftDrawerVisible, moveState } from '@/logic/moveable'
import { getStyleConst, customPrimaryColor, localConfig, globalState } from '@/logic/store'
import { widgetsList } from '@/newtab/widgets/registry'

const state = reactive({
  isCursorInDraftDrawer: false,
})

const widgets = computed(() =>
  widgetsList.map((item) => ({
    code: item.code,
    label: window.$t(item.widgetLabel || item.code),
    iconName: item.iconName || 'material-symbols:widgets-outline',
    iconSize: item.iconSize || 30,
    disabled: localConfig[item.code]?.enabled,
  })),
)

const handleExitDragMode = () => {
  if (globalState.isGuideMode) {
    return
  }
  toggleIsDragMode(false)
}

// DraftDrawer
const handleDraftDrawerMouseEnter = () => {
  state.isCursorInDraftDrawer = true
}

const handleDraftDrawerMouseLeave = () => {
  state.isCursorInDraftDrawer = false
}

// Draft
const handleDraftMouseDown = async (e: MouseEvent) => {
  localConfig[moveState.currDragTarget.code].enabled = true
  await nextTick()
  // 以光标位置为组件的中心开始拖拽
  const mouseDownTask = moveState.mouseDownTaskMap.get(moveState.currDragTarget.code)
  if (mouseDownTask) {
    mouseDownTask(e, true) // startDrag(e: MouseEvent, resite: boolean)
  }
  // 执行一次 onDragging，为消除首次启用组件时会展示上次存储的布局
  const mouseMoveTask = moveState.mouseMoveTaskMap.get(moveState.currDragTarget.code)
  if (mouseMoveTask) {
    mouseMoveTask(e)
  }
}

const handleDraftMouseMove = async (e: MouseEvent) => {
  const mouseMoveTask = moveState.mouseMoveTaskMap.get(moveState.currDragTarget.code)
  if (mouseMoveTask) {
    mouseMoveTask(e)
  }
}

const handleDraftMouseUp = (e: MouseEvent) => {
  const mouseUpTask = moveState.mouseUpTaskMap.get(moveState.currDragTarget.code)
  if (mouseUpTask) {
    mouseUpTask(e)
  }
  const isEnabled = !state.isCursorInDraftDrawer
  localConfig[moveState.currDragTarget.code].enabled = isEnabled
  if (!isEnabled) {
    return
  }
  gaProxy('move', ['widget', moveState.currDragTarget.code], {
    enabled: true,
  })
}

// keyboard listener
const keyboardHandler = (e: KeyboardEvent) => {
  if (!isDragMode.value) {
    return
  }
  const { code } = e
  if (code === 'Escape') {
    nextTick(() => {
      toggleIsDragMode()
    })
    return
  }
  if (['Delete', 'Backspace'].includes(code)) {
    if (moveState.currDragTarget.code.length === 0) {
      return
    }
    onDeleteComponent()
  }
}

onMounted(() => {
  moveState.mouseDownTaskMap.set('draft-common', handleDraftMouseDown)
  moveState.mouseMoveTaskMap.set('draft-common', handleDraftMouseMove)
  moveState.mouseUpTaskMap.set('draft-common', handleDraftMouseUp)
  addKeydownTask('draft-tool', keyboardHandler)
})

onUnmounted(() => {
  moveState.mouseDownTaskMap.delete('draft-common')
  moveState.mouseMoveTaskMap.delete('draft-common')
  moveState.mouseUpTaskMap.delete('draft-common')
  removeKeydownTask('draft-tool')
})

const onDeleteComponent = () => {
  localConfig[moveState.currDragTarget.code].enabled = false
  gaProxy('move', ['widget', moveState.currDragTarget.code], {
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

const bgMoveableWidgetMain = getStyleConst('bgMoveableWidgetMain')
const bgMoveableWidgetDelete = getStyleConst('bgMoveableWidgetDelete')
const bgMoveableToolDrawer = getStyleConst('bgMoveableToolDrawer')
const borderMoveableToolItem = getStyleConst('borderMoveableToolItem')
</script>

<template>
  <div
    id="draft-tool"
    :class="{
      'draft-tool--active': isDragMode && isDraftDrawerVisible,
      'draft-tool--shadow': isDragMode,
    }"
    @mouseenter="handleDraftDrawerMouseEnter"
    @mouseleave="handleDraftDrawerMouseLeave"
  >
    <div
      v-if="isDragMode"
      class="tool__drawer"
    >
      <!-- switch button -->
      <div
        class="drawer__switch"
        @click="handleToggleIsDraftDrawerVisible()"
      >
        <Icon
          :icon="ICONS.expandLess"
          class="switch__icon"
          :class="{ 'switch__icon--active': isDraftDrawerVisible }"
        />
      </div>

      <div class="drawer__header">
        <div
          class="header__done"
          @click="handleExitDragMode"
        >
          <div class="done__esc" />
          <NButton
            class="done__exit"
            type="primary"
            size="small"
          >
            <p>{{ $t('rightMenu.doneEdit') }}</p>
          </NButton>
        </div>
        <p class="header__tips">{{ $t('prompts.widgetDrawerTips') }}</p>
      </div>

      <div class="drawer__content">
        <div
          v-for="item in widgets"
          v-show="!item.disabled"
          :key="item.label"
          class="content__item"
          data-target-type="draft"
          :data-target-code="item.code"
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
      :class="{ 'tool__delete--active': isDragMode && moveState.isWidgetDraging }"
      @mouseenter="handlerDeleteMouseEnter"
      @mouseleave="handlerDeleteMouseLeave"
      @mouseup="handlerDeleteMouseUp"
    >
      <Icon
        v-show="!moveState.isDeleteHover"
        :icon="ICONS.trash"
        class="delete__icon"
      />
      <Icon
        v-show="moveState.isDeleteHover"
        :icon="ICONS.trashX"
        class="delete__icon"
      />
    </div>
  </div>
</template>

<style>
.draft-tool--active {
  bottom: 0 !important;
}
.draft-tool--shadow {
  box-shadow: 0 0 10px 3px #272727;
}

#draft-tool {
  z-index: 20;
  position: fixed;
  bottom: -265px;
  left: 25vw;
  width: 50vw;
  height: 265px;
  color: #fff;
  background-color: v-bind(bgMoveableToolDrawer);
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
  transition: all 300ms ease;
  .tool__drawer {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    backdrop-filter: saturate(50%) blur(4px);
    border-top-left-radius: 15px;
    border-top-right-radius: 15px;
    /* background-image: radial-gradient(transparent 1px, #000 1px);
    background-size: 4px 4px; */
    .drawer__switch {
      z-index: 30;
      position: absolute;
      top: -25px;
      left: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 5vw;
      height: 25px;
      background-color: v-bind(bgMoveableToolDrawer);
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      box-shadow: 0 0 5px 3px #272727;
      transform: translate(-50%, 0);
      cursor: pointer;
      .switch__icon {
        flex: 0 0 auto;
        font-size: 26px;
        transition: all 400ms ease-in-out;
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
      justify-content: space-between;
      align-items: center;
      height: 50px;
      width: 100%;
      border-bottom: 1px solid v-bind(borderMoveableToolItem);
      .header__done {
        display: flex;
        align-items: center;
        cursor: pointer;
        .done__exit {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .done__esc {
          margin: 0 8px 0 1.5vw;
          width: 37px;
          height: 37px;
          background-size: 100%;
          background-image: url('/assets/img/keyboard/esc.png');
        }
      }
      .header__tips {
        margin-top: 10px;
        margin-right: 2vw;
        font-size: 12px;
        opacity: 0.8;
      }
    }

    .drawer__content {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      padding: 0.5vw;
      .content__item {
        flex-shrink: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: 10px 0.9vw;
        width: 8vw;
        height: 80px;
        font-size: 14px;
        border: 2px solid v-bind(borderMoveableToolItem);
        border-radius: 8px;
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
        background-color: v-bind(bgMoveableWidgetMain);
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
    background-color: v-bind(bgMoveableWidgetDelete);
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
