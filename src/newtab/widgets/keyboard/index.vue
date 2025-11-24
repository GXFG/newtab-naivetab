<script setup lang="ts">
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import { isDragMode } from '@/logic/moveable'
import { KEYBOARD_NOT_ALLOW_KEYCODE_LIST } from '@/logic/constants/keyboard'
import { currKeyboardConfig, keyboardCurrentModelAllKeyList } from '@/logic/keyboard'
import { state as keyboardState, openPage, handleSpecialKeycapExec, getKeycapType, getKeycapUrl, handlePressKeycap, getCustomKeycapWidth } from '~/newtab/widgets/keyboard/logic'
import { localConfig, getStyleField, getStyleConst } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import KeyboardKeycap from './components/KeyboardKeycap.vue'
import { WIDGET_CODE } from './config'

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
  if (!localConfig.keyboard.isDblclickOpen) {
    keyboardState.currSelectKeyCode = code
    openPage(url, shiftKey, altKey)
    return
  }
  // 双击打开书签
  clearTimeout(keyboardTimer)
  if (code === keyboardState.currSelectKeyCode) {
    openPage(url, shiftKey, altKey)
  } else {
    keyboardState.currSelectKeyCode = code
    keyboardTimer = setTimeout(() => {
      keyboardState.currSelectKeyCode = ''
    }, localConfig.keyboard.dblclickIntervalTime)
  }
}

onMounted(() => {
  addKeydownTask(WIDGET_CODE, keyboardTask)
})

onUnmounted(() => {
  removeKeydownTask(WIDGET_CODE)
})

const customShellVerticalPadding = getStyleField(WIDGET_CODE, 'shellVerticalPadding', 'vmin')
const customShellHorizontalPadding = getStyleField(WIDGET_CODE, 'shellHorizontalPadding', 'vmin')
const customShellBorderRadius = getStyleField(WIDGET_CODE, 'shellBorderRadius', 'px')
const customShellColor = getStyleField(WIDGET_CODE, 'shellColor')
const customShellShadowColor = getStyleField(WIDGET_CODE, 'shellShadowColor')
const customShellBackgroundBlur = getStyleField(WIDGET_CODE, 'shellBackgroundBlur', 'px')

const customPlateSinglePadding = getStyleField(WIDGET_CODE, 'platePadding', 'vmin')
const customPlateDoublePadding = getStyleField(WIDGET_CODE, 'platePadding', 'vmin', 2)
const customPlateEdge = computed(() => `-${customPlateSinglePadding.value}`)
const customPlateSize = computed(() => `${customPlateDoublePadding.value}`)
const customPlateBorderRadius = getStyleField(WIDGET_CODE, 'plateBorderRadius', 'px')
const customPlateColor = getStyleField(WIDGET_CODE, 'plateColor')
const customPlateBackgroundBlur = getStyleField(WIDGET_CODE, 'plateBackgroundBlur', 'px')

const customKeyboardKeyFontFamily = getStyleField(WIDGET_CODE, 'keycapBookmarkFontFamily')
const customKeyboardKeyFontSize = getStyleField(WIDGET_CODE, 'keycapBookmarkFontSize', 'vmin')

// keycap-base
const customKeycapPadding = getStyleField(WIDGET_CODE, 'keycapPadding', 'vmin')
const customKeycapBaseSize = getStyleField(WIDGET_CODE, 'keycapSize', 'vmin')

const getKeycapWrapStyle = (code: string) => {
  let style = ''
  const width = getCustomKeycapWidth(code)
  style += `width: ${width.value}; `
  const marginLeft = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].marginLeft
  if (marginLeft) {
    style += `margin-left: ${getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', marginLeft).value}; `
  }
  const marginRight = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].marginRight
  if (marginRight) {
    style += `margin-right: ${getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', marginRight).value}; `
  }
  const marginBottom = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].marginBottom
  if (marginBottom) {
    style += `margin-bottom: ${getStyleField(WIDGET_CODE, 'keycapSize', 'vmin', marginBottom).value}; `
  }
  return style
}

const bgMoveableWidgetMain = getStyleConst('bgMoveableWidgetMain')
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="keyboard__container"
      :class="{
        'keyboard__container--drag': isDragMode,
        'keyboard__container--hover': !isDragMode,
        'keyboard__container-shell': localConfig.keyboard.isShellVisible,
        'keyboard__container-shell--shadow': localConfig.keyboard.isShellVisible && localConfig.keyboard.isShellShadowEnabled,
      }"
    >
      <div
        v-for="(rowItem, rowIndex) in currKeyboardConfig.list"
        :key="rowIndex"
        class="keyboard__row"
      >
        <div
          v-for="keyCode in rowItem"
          :key="keyCode"
          class="row__keycap-wrap"
          :style="getKeycapWrapStyle(keyCode)"
        >
          <div
            v-if="localConfig.keyboard.isShellVisible && localConfig.keyboard.isPlateVisible"
            class="row__keycap-plate"
          />
          <KeyboardKeycap :key-code="keyCode" />
        </div>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#keyboard {
  font-family: v-bind(customKeyboardKeyFontFamily);
  font-size: v-bind(customKeyboardKeyFontSize);
  user-select: none;
  .keyboard__container {
    z-index: 10;
    position: absolute;
    overflow: hidden;
    .keyboard__row {
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
          backdrop-filter: blur(v-bind(customPlateBackgroundBlur));
        }
      }
    }
  }
  .keyboard__container-shell {
    padding: v-bind(customShellVerticalPadding) v-bind(customShellHorizontalPadding);
    border-radius: v-bind(customShellBorderRadius);
    background-color: v-bind(customShellColor) !important;
    backdrop-filter: blur(v-bind(customShellBackgroundBlur));
  }
  .keyboard__container-shell--shadow {
    background: linear-gradient(110deg, rgba(0, 0, 0, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(0, 0, 0, 0.15) 100%),
      linear-gradient(10deg, rgba(0, 0, 0, 0.15) 0%, rgba(255, 255, 255, 0.05) 40%, rgba(0, 0, 0, 0.15) 100%);
    box-shadow:
      v-bind(customShellShadowColor) 0px 2px 4px 0px,
      v-bind(customShellShadowColor) 0px 2px 16px 0px;
  }
  .keyboard__container--hover {
    cursor: pointer;
  }
  .keyboard__container--drag {
    background-color: transparent !important;
    &:hover {
      background-color: v-bind(bgMoveableWidgetMain) !important;
    }
  }
}
</style>
