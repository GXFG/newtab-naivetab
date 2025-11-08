<script setup lang="ts">
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { isDragMode } from '@/logic/moveable'
import { KEYBOARD_NOT_ALLOW_KEYCODE_LIST, currKeyboardConfig, keyboardCurrentModelAllKeyList } from '@/logic/keyboard'
import { state as bookmarkState, openPage, handleSpecialKeycapExec, getKeycapType, getKeycapUrl, handlePressKeycap, getCustomKeycapWidth } from '@/logic/bookmark'
import { localConfig, getIsComponentRender, getLayoutStyle, getStyleField, getStyleConst } from '@/logic/store'
import MoveableComponentWrap from '@/newtab/components/moveable/MoveableComponentWrap.vue'
import KeyboardKeycap from './components/KeyboardKeycap.vue'

const CNAME = 'bookmark'
const isRender = getIsComponentRender(CNAME)

// keyboard listener
let keyboardTimer: ReturnType<typeof setTimeout>

const keyboardTask = (e: KeyboardEvent) => {
  if (isDragMode.value) {
    return
  }
  const { code, shiftKey, ctrlKey, altKey, metaKey } = e
  if (code === 'Escape') {
    e.preventDefault() // 阻止Esc默认事件，按esc会取消打开页面，表现为Esc的书签无法打开
  }
  if (KEYBOARD_NOT_ALLOW_KEYCODE_LIST.includes(code)) {
    return
  }
  if (ctrlKey || metaKey) {
    return
  }
  // 过滤非当前配置下的按键
  if (!keyboardCurrentModelAllKeyList.value.includes(code)) {
    return
  }
  const isHandled = handleSpecialKeycapExec(code, getKeycapType(code))
  const url = getKeycapUrl(code)
  if (isHandled || url.length === 0) {
    handlePressKeycap(code)
    return
  }
  // shift + key 后台打开书签，alt + key 新标签页打开
  if (!localConfig.bookmark.isDblclickOpen) {
    bookmarkState.currSelectKeyCode = code
    openPage(url, shiftKey, altKey)
    return
  }
  // 双击打开书签
  clearTimeout(keyboardTimer)
  if (code === bookmarkState.currSelectKeyCode) {
    openPage(url, shiftKey, altKey)
  } else {
    bookmarkState.currSelectKeyCode = code
    keyboardTimer = setTimeout(() => {
      bookmarkState.currSelectKeyCode = ''
    }, localConfig.bookmark.dblclickIntervalTime)
  }
}

onMounted(() => {
  addKeydownTask(CNAME, keyboardTask)
})

onUnmounted(() => {
  removeKeydownTask(CNAME)
})

const dragStyle = ref('')

const containerStyle = getLayoutStyle(CNAME)

const customShellVerticalPadding = getStyleField(CNAME, 'shellVerticalPadding', 'vmin')
const customShellHorizontalPadding = getStyleField(CNAME, 'shellHorizontalPadding', 'vmin')
const customShellBorderRadius = getStyleField(CNAME, 'shellBorderRadius', 'px')
const customShellColor = getStyleField(CNAME, 'shellColor')
const customShellShadowColor = getStyleField(CNAME, 'shellShadowColor')

const customPlateSinglePadding = getStyleField(CNAME, 'platePadding', 'vmin')
const customPlateDoublePadding = getStyleField(CNAME, 'platePadding', 'vmin', 2)
const customPlateEdge = computed(() => `-${customPlateSinglePadding.value}`)
const customPlateSize = computed(() => `${customPlateDoublePadding.value}`)
const customPlateBorderRadius = getStyleField(CNAME, 'plateBorderRadius', 'px')
const customPlateColor = getStyleField(CNAME, 'plateColor')

const customBookmarkKeyFontFamily = getStyleField(CNAME, 'keycapBookmarkFontFamily')
const customBookmarkKeyFontSize = getStyleField(CNAME, 'keycapBookmarkFontSize', 'vmin')

// keycap-base
const customKeycapPadding = getStyleField(CNAME, 'keycapPadding', 'vmin')
const customKeycapBaseSize = getStyleField(CNAME, 'keycapSize', 'vmin')

const getKeycapWrapStyle = (code: string) => {
  let style = ''
  const width = getCustomKeycapWidth(code)
  style += `width: ${width.value}; `
  const marginLeft = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].marginLeft
  if (marginLeft) {
    style += `margin-left: ${getStyleField(CNAME, 'keycapSize', 'vmin', marginLeft).value}; `
  }
  const marginRight = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].marginRight
  if (marginRight) {
    style += `margin-right: ${getStyleField(CNAME, 'keycapSize', 'vmin', marginRight).value}; `
  }
  const marginBottom = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].marginBottom
  if (marginBottom) {
    style += `margin-bottom: ${getStyleField(CNAME, 'keycapSize', 'vmin', marginBottom).value}; `
  }
  return style
}

const bgMoveableComponentMain = getStyleConst('bgMoveableComponentMain')
</script>

<template>
  <MoveableComponentWrap
    v-model:dragStyle="dragStyle"
    component-name="bookmark"
  >
    <div
      v-if="isRender"
      id="bookmark"
      data-target-type="component"
      data-target-name="bookmark"
    >
      <div
        class="bookmark__container"
        :style="dragStyle || containerStyle"
        :class="{
          'bookmark__container--drag': isDragMode,
          'bookmark__container--hover': !isDragMode,
          'bookmark__container-shell': localConfig.bookmark.isShellVisible,
          'bookmark__container-shell--shadow': localConfig.bookmark.isShellVisible && localConfig.bookmark.isShellShadowEnabled,
        }"
      >
        <div
          v-for="(rowItem, rowIndex) in currKeyboardConfig.list"
          :key="rowIndex"
          class="bookmark__row"
        >
          <div
            v-for="keyCode in rowItem"
            :key="keyCode"
            class="row__keycap-wrap"
            :style="getKeycapWrapStyle(keyCode)"
          >
            <div
              v-if="localConfig.bookmark.isShellVisible && localConfig.bookmark.isPlateVisible"
              class="row__keycap-plate"
            />
            <KeyboardKeycap :key-code="keyCode" />
          </div>
        </div>
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<style scoped>
#bookmark {
  font-family: v-bind(customBookmarkKeyFontFamily);
  font-size: v-bind(customBookmarkKeyFontSize);
  user-select: none;
  .bookmark__container {
    z-index: 10;
    position: absolute;
    overflow: hidden;
    .bookmark__row {
      display: flex;
      justify-content: space-between;
      .row__keycap-wrap {
        flex: 0 0 auto;
        position: relative;
        padding: v-bind(customKeycapPadding);
        height: v-bind(customKeycapBaseSize);
        .row__keycap-plate {
          z-index: -1;
          position: absolute;
          top: v-bind(customPlateEdge);
          left: v-bind(customPlateEdge);
          width: calc(100% + v-bind(customPlateSize));
          height: calc(100% + v-bind(customPlateSize));
          background: v-bind(customPlateColor);
          border-radius: v-bind(customPlateBorderRadius);
        }
      }
    }
  }
  .bookmark__container-shell {
    padding: v-bind(customShellVerticalPadding) v-bind(customShellHorizontalPadding);
    border-radius: v-bind(customShellBorderRadius);
    background-color: v-bind(customShellColor) !important;
  }
  .bookmark__container-shell--shadow {
    background: linear-gradient(110deg, rgba(0, 0, 0, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(0, 0, 0, 0.15) 100%),
      linear-gradient(10deg, rgba(0, 0, 0, 0.15) 0%, rgba(255, 255, 255, 0.05) 40%, rgba(0, 0, 0, 0.15) 100%);
    box-shadow:
      v-bind(customShellShadowColor) 0px 2px 4px 0px,
      v-bind(customShellShadowColor) 0px 2px 16px 0px;
  }
  .bookmark__container--hover {
    cursor: pointer;
  }
  .bookmark__container--drag {
    background-color: transparent !important;
    &:hover {
      background-color: v-bind(bgMoveableComponentMain) !important;
    }
  }
}
</style>
