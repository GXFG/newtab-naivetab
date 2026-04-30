<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { gaProxy } from '@/logic/gtag'
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import {
  isDragMode,
  toggleIsDragMode,
  isDraftDrawerVisible,
  handleToggleIsDraftDrawerVisible,
  moveState,
  animateDeleteWidget,
} from '@/logic/moveable'
import {
  customPrimaryColor,
  localConfig,
  localState,
  globalState,
} from '@/logic/store'
import { styleConst } from '@/styles/const'
import { widgetsRegistry } from '@/newtab/widgets/registry'
import { WIDGET_GROUPS } from '@/newtab/widgets/codes'

const draftDrawerStyle = computed(() => {
  const c = styleConst.value
  const ac = localState.value.currAppearanceCode
  return {
    '--nt-bg-moveable-tool-drawer':
      c.bgMoveableToolDrawer[ac] || c.bgMoveableToolDrawer[0],
    '--nt-draft-custom-primary-color': customPrimaryColor.value,
  }
})

const state = reactive({
  isCursorInDraftDrawer: false,
})

const widgetGroups = computed(() =>
  WIDGET_GROUPS.map((group) => ({
    label: window.$t(group.labelKey),
    items: group.codes
      .map((code) => {
        const meta = widgetsRegistry[code]
        if (!meta) return null
        return {
          code: meta.code,
          label: window.$t(meta.widgetLabel || meta.code),
          iconName: meta.iconName || 'material-symbols:widgets-outline',
          iconSize: meta.iconSize || 30,
          disabled: localConfig[meta.code]?.enabled,
        }
      })
      .filter(Boolean),
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
  // ⚠️  必须 await startDrag 完成（它内部需要 nextTick 等 DOM 渲染），
  //     再执行 onDragging，否则 startState 尚未初始化，组件会出现在错误位置
  const mouseDownTask = moveState.mouseDownTaskMap.get(
    moveState.currDragTarget.code,
  )
  if (mouseDownTask) {
    await mouseDownTask(e, true) // startDrag(e: MouseEvent, resite: boolean)
  }
  // 执行一次 onDragging，为消除首次启用组件时会展示上次存储的布局
  const mouseMoveTask = moveState.mouseMoveTaskMap.get(
    moveState.currDragTarget.code,
  )
  if (mouseMoveTask) {
    mouseMoveTask(e)
  }
}

const handleDraftMouseMove = async (e: MouseEvent) => {
  const mouseMoveTask = moveState.mouseMoveTaskMap.get(
    moveState.currDragTarget.code,
  )
  if (mouseMoveTask) {
    mouseMoveTask(e)
  }
}

const handleDraftMouseUp = (e: MouseEvent) => {
  const mouseUpTask = moveState.mouseUpTaskMap.get(
    moveState.currDragTarget.code,
  )
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
  const code = moveState.currDragTarget.code
  if (!code) return
  animateDeleteWidget(code as WidgetCodes)
  gaProxy('delete', ['widget', code], {
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
</script>

<template>
  <div
    id="draft-tool"
    :style="draftDrawerStyle"
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

      <div class="draft__content">
        <template
          v-for="group in widgetGroups"
          :key="group.label"
        >
          <div
            v-if="group.items.some((item) => !item!.disabled)"
            class="content__group"
          >
            <span class="group__label">{{ group.label }}</span>
            <div class="group__items">
              <div
                v-for="item in group.items"
                v-show="!item!.disabled"
                :key="item!.label"
                class="content__item"
                data-target-type="draft"
                :data-target-code="item!.code"
              >
                <div
                  class="item__icon"
                  :style="`font-size: ${item!.iconSize}px`"
                >
                  <Icon :icon="item!.iconName" />
                </div>
                <span class="item__text">{{ item!.label }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <!-- delete -->
    <div
      v-if="isDragMode"
      class="tool__delete"
      :class="{
        'tool__delete--active': isDragMode && moveState.isWidgetStartDrag,
      }"
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
  box-shadow:
    0 -4px 24px var(--gray-alpha-55),
    0 -1px 6px var(--gray-alpha-35);
}

#draft-tool {
  z-index: 20;
  position: fixed;
  bottom: -300px;
  left: 25vw;
  width: 50vw;
  height: 280px;
  color: #fff;
  background-color: var(--nt-bg-moveable-tool-drawer);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  transition: all 300ms cubic-bezier(0.34, 1.06, 0.64, 1);
  /* 顶部高光边框线 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--gray-alpha-18) 30%,
      var(--gray-alpha-28) 50%,
      var(--gray-alpha-18) 70%,
      transparent
    );
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  }

  .tool__drawer {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    height: 100%;
    backdrop-filter: saturate(180%) blur(20px);
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;

    .drawer__switch {
      z-index: 30;
      position: absolute;
      top: -26px;
      left: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 5vw;
      height: 26px;
      background-color: var(--nt-bg-moveable-tool-drawer);
      backdrop-filter: saturate(180%) blur(20px);
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      box-shadow:
        -3px -4px 10px var(--gray-alpha-40),
        3px -4px 10px var(--gray-alpha-40);
      transform: translate(-50%, 0);
      cursor: pointer;
      transition: color 200ms ease;
      /* 顶部高光 */
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 10%;
        right: 10%;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          var(--gray-alpha-30) 50%,
          transparent
        );
        border-radius: 50%;
      }
      .switch__icon {
        flex: 0 0 auto;
        font-size: 22px;
        opacity: 0.7;
        transition: all 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .switch__icon--active {
        transform: rotate(180deg);
        opacity: 1;
      }
    }
    .drawer__switch:hover {
      color: var(--nt-draft-custom-primary-color);
      .switch__icon {
        opacity: 1;
      }
    }

    .drawer__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 52px;
      width: 100%;
      border-bottom: 1px solid var(--gray-alpha-08);
      background: linear-gradient(
        180deg,
        var(--gray-alpha-04) 0%,
        transparent 100%
      );
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      .header__done {
        display: flex;
        align-items: center;
        cursor: pointer;
        .done__exit {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 150ms ease;
          &:hover {
            opacity: 0.85;
          }
        }
        .done__esc {
          margin: 0 8px 0 1.5vw;
          width: 34px;
          height: 34px;
          background-size: 100%;
          background-image: url('/assets/img/keyboard/esc.png');
          opacity: 0.85;
          filter: drop-shadow(0 1px 2px var(--gray-alpha-40));
        }
      }
      .header__tips {
        margin-right: 2vw;
        font-size: 11px;
        opacity: 0.45;
        letter-spacing: 0.02em;
      }
    }

    .draft__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      padding: 6px 0.6vw 0;
      overflow-y: auto;
      /* 自定义滚动条 */
      scrollbar-width: thin;
      scrollbar-color: var(--gray-alpha-15) transparent;
      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--gray-alpha-15);
        border-radius: 2px;
      }
      .content__group {
        display: flex;
        flex-direction: column;
        margin-bottom: 6px;
        &:last-child {
          margin-bottom: 0;
        }
        .group__label {
          padding: 2px 4px 4px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.35;
          user-select: none;
        }
        .group__items {
          display: flex;
          flex-wrap: wrap;
          width: 100%;
        }
      }
      .content__item {
        flex-shrink: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: 6px 0.6vw;
        width: 8vw;
        height: 78px;
        font-size: 12px;
        border: 1px solid var(--gray-alpha-12);
        border-radius: var(--radius-xl);
        cursor: move;
        user-select: none;
        background: var(--gray-alpha-04);
        transition:
          background 180ms ease,
          border-color 180ms ease,
          transform 150ms ease,
          box-shadow 180ms ease;
        position: relative;
        overflow: hidden;
        /* 卡片内部顶部高光 */
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: linear-gradient(
            180deg,
            var(--gray-alpha-07) 0%,
            transparent 100%
          );
          pointer-events: none;
        }
        .item__icon {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 44px;
          opacity: 0.9;
          transition:
            opacity 180ms ease,
            transform 180ms ease;
        }
        .item__text {
          flex: 1;
          padding-top: 4px;
          height: 20px;
          line-height: 20px;
          text-align: center;
          border-top: 1px solid var(--gray-alpha-08);
          opacity: 0.8;
          letter-spacing: 0.02em;
          font-size: 11px;
          width: 100%;
        }
      }
      .content__item:hover {
        background: rgba(100, 181, 246, 0.18);
        border-color: rgba(100, 181, 246, 0.45);
        box-shadow:
          0 2px 12px rgba(100, 181, 246, 0.2),
          inset 0 1px 0 var(--gray-alpha-12);
        transform: translateY(-1px);
        .item__icon {
          opacity: 1;
          transform: scale(1.08);
        }
        .item__text {
          opacity: 1;
        }
      }
      .content__item:active {
        transform: scale(0.96);
        box-shadow: none;
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
    background: radial-gradient(
      circle at 30% 30%,
      rgba(255, 100, 100, 1),
      rgba(220, 38, 38, 1)
    );
    box-shadow:
      -4px 4px 20px rgba(220, 38, 38, 0.5),
      0 0 30px rgba(255, 80, 80, 0.15);
    transition: all 300ms cubic-bezier(0.34, 1.06, 0.64, 1);
    transform: rotate(45deg) scale(1);
    .delete__icon {
      position: absolute;
      bottom: 20px;
      left: 80px;
      font-size: 36px;
      color: #fff;
      transform: rotate(-45deg);
      filter: drop-shadow(0 2px 4px var(--gray-alpha-35));
      transition:
        transform 250ms cubic-bezier(0.34, 1.06, 0.64, 1),
        filter 250ms ease;
    }
  }
  .tool__delete--active {
    top: -100px;
    right: -100px;
    box-shadow:
      -4px 4px 30px rgba(220, 38, 38, 0.7),
      0 0 50px rgba(255, 80, 80, 0.25);
  }
  .tool__delete:hover {
    transform: rotate(45deg) scale(1.12);
    box-shadow:
      -6px 6px 40px rgba(220, 38, 38, 0.8),
      0 0 60px rgba(255, 80, 80, 0.35);
    .delete__icon {
      filter: drop-shadow(0 2px 12px var(--gray-alpha-55));
      transform: rotate(-45deg) scale(1.15);
    }
  }
  .tool__delete--active:hover {
    transform: rotate(45deg) scale(1.12);
  }
}
</style>
