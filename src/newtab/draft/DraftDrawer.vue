<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { gaProxy } from '@/logic/utils/gtag'
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import NTScrollArea from '@/components/ui/NTScrollArea.vue'
import {
  isDragMode,
  toggleDragMode,
  isDraftDrawerVisible,
  handleToggleIsDraftDrawerVisible,
  moveState,
  animateDeleteWidget,
  bringWidgetToFront,
} from '@/logic/moveable'
import { localConfig } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'
import { widgetsRegistry } from '@/newtab/widgets/registry'
import { WIDGET_GROUPS } from '@/common/widget-constants'

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
  toggleDragMode(false)
}
// DraftDrawer
const handleDraftDrawerMouseEnter = () => {
  state.isCursorInDraftDrawer = true
}

const handleDraftDrawerMouseLeave = () => {
  state.isCursorInDraftDrawer = false
}

// Draft
/**
 * 注意：mousedown → enable widget → nextTick → startDrag → mouseup → disable widget
 * 都在同一事件循环内完成。浏览器在 JS 执行期间不合成新帧，因此单击（非拖拽）
 * 不会产生视觉闪烁。如果未来浏览器行为变化导致可见闪烁，可在 mouseup 中检查
 * 鼠标位移 delta，仅当位移超过阈值时才执行 enable/disable 循环。
 */
const handleDraftMouseDown = async (e: MouseEvent) => {
  // 将要拖出的 widget 置顶，确保首次渲染即处于最上层
  bringWidgetToFront(moveState.currDragTarget.code as WidgetCodes)
  localConfig[moveState.currDragTarget.code as WidgetCodes].enabled = true
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

const handleDraftMouseMove = (e: MouseEvent) => {
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
  const wasEnabled =
    localConfig[moveState.currDragTarget.code as WidgetCodes].enabled
  localConfig[moveState.currDragTarget.code as WidgetCodes].enabled = isEnabled
  if (!isEnabled) {
    return
  }
  if (!wasEnabled) {
    gaProxy('click', ['widget', 'add', moveState.currDragTarget.code])
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
      toggleDragMode()
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
  addKeydownTask('draft-tool', keyboardHandler, 30)
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
    source: 'keyboard',
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
          <span class="done__label">{{ $t('rightMenu.doneEdit') }}</span>
        </div>
        <p class="header__tips">{{ $t('prompts.widgetDrawerTips') }}</p>
      </div>

      <div class="draft__content">
        <NTScrollArea>
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
        </NTScrollArea>
      </div>
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
</template>

<style>
#draft-tool.draft-tool--active {
  transform: translateY(0);
  pointer-events: auto;
  /* transition 继承 #draft-tool 基类的值（--transition-drawer），双向一致 */
}
#draft-tool.draft-tool--shadow {
  box-shadow: var(--nt-moveable-tool-drawer-shadow);
}

#draft-tool {
  z-index: 200;
  position: fixed;
  bottom: 0;
  left: 25vw;
  width: 50vw;
  height: 280px;
  /* 基础态：transform 下移出屏幕（GPU 加速，不触发布局重排） */
  transform: translateY(100%);
  background-color: var(--nt-bg-moveable-tool-drawer);
  border-top-left-radius: var(--radius-2xl);
  border-top-right-radius: var(--radius-2xl);
  /* 两个方向统一用 --transition-drawer（与 reka/drawer.css 一致） */
  transition:
    transform var(--transition-drawer),
    box-shadow var(--transition-base);
  pointer-events: none;
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
      var(--nt-moveable-tool-drawer-highlight) 30%,
      var(--nt-moveable-tool-drawer-highlight-center) 50%,
      var(--nt-moveable-tool-drawer-highlight) 70%,
      transparent
    );
    border-top-left-radius: var(--radius-2xl);
    border-top-right-radius: var(--radius-2xl);
  }

  .tool__drawer {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    height: 100%;
    backdrop-filter: saturate(180%) blur(20px);
    border-top-left-radius: var(--radius-2xl);
    border-top-right-radius: var(--radius-2xl);

    .drawer__switch {
      z-index: 201;
      /* 始终可点击：即使在 #draft-tool pointer-events:none 时也允许交互 */
      pointer-events: auto;
      position: absolute;
      top: -26px;
      left: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 5vw;
      min-width: 60px;
      height: 26px;
      background-color: var(--nt-bg-moveable-tool-drawer);
      backdrop-filter: saturate(180%) blur(20px);
      border-top-left-radius: var(--radius-lg);
      border-top-right-radius: var(--radius-lg);
      box-shadow: var(--nt-moveable-tool-drawer-switch-shadow);
      transform: translate(-50%, 0);
      cursor: pointer;
      transition: color var(--transition-base);
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
          var(--nt-moveable-tool-drawer-switch-highlight) 50%,
          transparent
        );
        border-radius: 50%;
      }
      .switch__icon {
        flex: 0 0 auto;
        font-size: 22px;
        opacity: 0.7;
        transition: all var(--transition-spring-bounce);
      }
      .switch__icon--active {
        transform: rotate(180deg);
        opacity: 1;
      }
      &:hover {
        color: var(--nt-primary-color);
        .switch__icon {
          opacity: 1;
        }
      }
    }

    .drawer__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 52px;
      width: 100%;
      border-bottom: 1px solid var(--nt-gray-minimal);
      background: linear-gradient(
        180deg,
        var(--nt-gray-ghost) 0%,
        transparent 100%
      );
      border-top-left-radius: var(--radius-2xl);
      border-top-right-radius: var(--radius-2xl);
      .header__done {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 2px 16px 2px 2px;
        margin-left: 1.5vw;
        border-radius: var(--radius-lg);
        background: var(--nt-gray-ghost);
        box-shadow: var(--shadow-sm);
        transition:
          background var(--transition-bg),
          box-shadow var(--transition-bg);
        &:hover {
          background: var(--nt-gray-light);
          box-shadow: var(--shadow-md);
        }
        .done__esc {
          width: 34px;
          height: 34px;
          background-size: 100%;
          background-image: url('/assets/img/keyboard/esc.png');
          opacity: 0.85;
          filter: var(--nt-moveable-tool-drawer-esc-filter);
        }
        .done__label {
          font-size: var(--text-sm);
          color: var(--nt-text-primary);
          font-weight: 500;
          white-space: nowrap;
        }
      }
      .header__tips {
        margin-right: 2vw;
        font-size: var(--text-xs);
        color: var(--nt-text-tertiary);
        letter-spacing: 0.02em;
      }
    }

    .draft__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      padding: 6px 0.6vw 0;
      min-height: 0;
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
          color: var(--nt-text-tertiary);
          opacity: 0.78;
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
        font-size: var(--text-sm);
        /* 去边框，用微阴影 + 极细半透明边定义边界（Apple 风格） */
        border: 0.5px solid var(--nt-gray-minimal);
        border-radius: var(--radius-xl);
        cursor: move;
        user-select: none;
        background: var(--nt-gray-ghost);
        box-shadow: var(--shadow-sm);
        position: relative;
        overflow: hidden;
        transition:
          transform 150ms ease,
          box-shadow 180ms ease,
          border-color 180ms ease,
          background 180ms ease;
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
            var(--nt-moveable-tool-drawer-card-highlight) 0%,
            transparent 100%
          );
          pointer-events: none;
        }
        &:hover {
          /* 中性 hover：不染色，仅 lift + 加深阴影 */
          background: var(--nt-gray-minimal);
          border-color: var(--nt-gray-moderate);
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
          .item__icon {
            opacity: 1;
            transform: scale(1.06);
          }
          .item__text {
            color: var(--nt-text-primary);
          }
        }
        &:active {
          transform: translateY(0) scale(0.97);
          box-shadow: var(--shadow-sm);
        }
        .item__icon {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 44px;
          opacity: 0.85;
          transition:
            opacity 180ms ease,
            transform 150ms ease;
        }
        .item__text {
          flex: 1;
          padding: 6px 4px 0;
          height: 20px;
          line-height: 20px;
          text-align: center;
          color: var(--nt-text-tertiary);
          letter-spacing: 0.02em;
          font-size: var(--text-xs);
          width: 100%;
          transition: color 180ms ease;
        }
      }
    }
  }
}

/* ============================================================
 * 删除区 — 独立于 #draft-tool（避免 transform 影响 position:fixed 包含块）
 * ============================================================ */
.tool__delete {
  z-index: 201;
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
  transition: all var(--transition-spring);
  transform: rotate(45deg) scale(1);
  .delete__icon {
    position: absolute;
    bottom: 20px;
    left: 80px;
    font-size: 36px;
    color: #fff;
    transform: rotate(-45deg);
    filter: var(--nt-moveable-tool-delete-icon-shadow);
    transition:
      transform 250ms cubic-bezier(0.34, 1.06, 0.64, 1),
      filter 250ms ease;
  }
  &:hover {
    transform: rotate(45deg) scale(1.12);
    box-shadow:
      -6px 6px 40px rgba(220, 38, 38, 0.8),
      0 0 60px rgba(255, 80, 80, 0.35);
    .delete__icon {
      filter: var(--nt-moveable-tool-delete-icon-hover-shadow);
      transform: rotate(-45deg) scale(1.15);
    }
  }
}

.tool__delete--active {
  top: -100px;
  right: -100px;
  box-shadow:
    -4px 4px 30px rgba(220, 38, 38, 0.7),
    0 0 50px rgba(255, 80, 80, 0.25);
  &:hover {
    transform: rotate(45deg) scale(1.12);
  }
}
</style>
