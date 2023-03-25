<script setup lang="ts">
import {
  TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP,
  KEYBOARD_CODE_TO_DEFAULT_CONFIG,
  KEYBOARD_NOT_ALLOW_KEYCODE_LIST,
  currKeyboardConfig,
  isDragMode,
  localConfig,
  getIsComponentRender,
  getLayoutStyle,
  getStyleField,
  addKeydownTask,
  createTab,
  getFaviconFromUrl,
  getBookmarkConfigName,
  getBookmarkConfigUrl,
  keyboardCurrentModelAllKeyList,
} from '@/logic'

const CNAME = 'bookmark'
const isRender = getIsComponentRender(CNAME)

const state = reactive({
  currSelectKeyCode: '',
  isLoadPageLoading: false,
})

const getKeycapLabel = (code: string) => {
  let value = KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].label
  const customLabel = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].label
  if (customLabel) {
    value = customLabel
  }
  return value
}

let delayResetTimer: NodeJS.Timeout

const delayResetPressKey = () => {
  clearTimeout(delayResetTimer)
  delayResetTimer = setTimeout(() => {
    state.currSelectKeyCode = ''
  }, 200)
}

const openPage = (url: string, isBgOpen = false, isNewTabOpen = false) => {
  if (url.length === 0) {
    return
  }
  if (isBgOpen) {
    // 后台打开
    createTab(url, false)
    delayResetPressKey()
    return
  }
  if (isNewTabOpen || localConfig.bookmark.isNewTabOpen || !/http/.test(url)) {
    // 以新标签页打开，其中非http协议只能以新标签页打开
    createTab(url)
    delayResetPressKey()
    return
  }
  // 当前标签页打开
  state.isLoadPageLoading = true
  window.$loadingBar.start()
  window.location.href = url
}

const onMouseDownKey = (e: MouseEvent, code: string, url: string) => {
  if (isDragMode.value || url.length === 0) {
    return
  }
  const { button, shiftKey, altKey } = e
  if (button === 0) {
    // 按下鼠标左键
    state.currSelectKeyCode = code
    openPage(url, shiftKey, altKey) // shift + 点击key后台打开书签，alt + key 新标签页打开
  } else if (button === 1) {
    // 按下鼠标中键
    openPage(url, true)
  }
}

// keyboard listener
let timer: NodeJS.Timeout

const keyboardTask = (e: KeyboardEvent) => {
  if (isDragMode.value) {
    return
  }
  // e.preventDefault()
  const { code, shiftKey, ctrlKey, altKey, metaKey } = e
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
  const url = getBookmarkConfigUrl(code)
  // shift + key 后台打开书签，alt + key 新标签页打开
  if (!localConfig.bookmark.isDblclickOpen) {
    state.currSelectKeyCode = code
    openPage(url, shiftKey, altKey)
  } else {
    clearTimeout(timer)
    if (code === state.currSelectKeyCode) {
      openPage(url, shiftKey, altKey)
    } else {
      state.currSelectKeyCode = code
      timer = setTimeout(() => {
        state.currSelectKeyCode = ''
      }, localConfig.bookmark.dblclickIntervalTime)
    }
  }
}

addKeydownTask(CNAME, keyboardTask)

const dragStyle = ref('')

const customPrimaryColor = getStyleField('general', 'primaryColor')
const containerStyle = getLayoutStyle(CNAME)

const customKeycapKeyFontFamily = getStyleField(CNAME, 'keycapKeyFontFamily')
const customKeycapKeyFontSize = getStyleField(CNAME, 'keycapKeyFontSize', 'vmin')
const customBookmarkKeyFontFamily = getStyleField(CNAME, 'keycapBookmarkFontFamily')
const customBookmarkKeyFontSize = getStyleField(CNAME, 'keycapBookmarkFontSize', 'vmin')
// keycap-base
const customKeycapPadding = getStyleField(CNAME, 'keycapPadding', 'vmin')
const customKeycapBaseSize = getStyleField(CNAME, 'keycapSize', 'vmin')
const customKeycapBorderRadius = getStyleField(CNAME, 'borderRadius', 'vmin')
const customKeycapTextPadding = getStyleField(CNAME, 'keycapSize', 'vmin', 0.08)
const customKeycapIconPadding = getStyleField(CNAME, 'keycapSize', 'vmin', 0.08)
// keycap-flat
const customKeycapStageFlatPadding = getStyleField(CNAME, 'keycapSize', 'vmin', 0.08)
// keycap-gmk
const KeycapkeycapGmkEdgeBaseSize = 0.03
const customKeycapkeycapGmkTopBorderWidth = getStyleField(CNAME, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize)
const customKeycapkeycapGmkHorizontalBorderWidth = getStyleField(CNAME, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize * 6)
const customKeycapkeycapGmkBottomBorderWidth = getStyleField(CNAME, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize * 7)
const customKeycapStageGmkMarginTop = getStyleField(CNAME, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize * 0.3)
const customKeycapStageGmkMarginLeft = getStyleField(CNAME, 'keycapSize', 'vmin', KeycapkeycapGmkEdgeBaseSize * 1.5)
const KeycapkeycapGmkEdgeHorizontalSize = KeycapkeycapGmkEdgeBaseSize * 10
const customKeycapStageGmkHeight = getStyleField(CNAME, 'keycapSize', 'vmin', 1 - KeycapkeycapGmkEdgeBaseSize * 8)
// keycap-dsa
const KeycapkeycapDsaEdgeBaseSize = 0.18
const KeycapkeycapDsaEdgeSize = KeycapkeycapDsaEdgeBaseSize * 1.7
const customKeycapDsaBorderWidth = getStyleField(CNAME, 'keycapSize', 'vmin', KeycapkeycapDsaEdgeBaseSize)
const customKeycapStageDsaMargin = getStyleField(CNAME, 'keycapSize', 'vmin', KeycapkeycapDsaEdgeBaseSize / 3.8)
const customKeycapStageDsaHeight = getStyleField(CNAME, 'keycapSize', 'vmin', 1 - KeycapkeycapDsaEdgeSize)
// keycap color
const customMainFontColor = getStyleField(CNAME, 'mainFontColor')
const customMainBackgroundColor = getStyleField(CNAME, 'mainBackgroundColor')
const customEmphasisOneFontColor = getStyleField(CNAME, 'emphasisOneFontColor')
const customEmphasisOneBackgroundColor = getStyleField(CNAME, 'emphasisOneBackgroundColor')
const customEmphasisTwoFontColor = getStyleField(CNAME, 'emphasisTwoFontColor')
const customEmphasisTwoBackgroundColor = getStyleField(CNAME, 'emphasisTwoBackgroundColor')

const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderColor = getStyleField(CNAME, 'borderColor')

const getCustomTextAlign = (code: string) => {
  let value = KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].textAlign
  const customTextAlign = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].textAlign
  if (customTextAlign) {
    value = customTextAlign
  }
  return value
}

const getCustomKeycapWidth = (code: string, addRatio = 0) => {
  let value = KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].size
  const customSize = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].size
  if (customSize) {
    value = customSize
  }
  value = value + addRatio
  const width = getStyleField(CNAME, 'keycapSize', 'vmin', value)
  return width
}

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

const getKeycapStyle = (code: string) => {
  let style = ''
  // 键帽强调色
  if (currKeyboardConfig.value.emphasisOneKeys.includes(code)) {
    style += `background-color: ${customEmphasisOneBackgroundColor.value}; color: ${customEmphasisOneFontColor.value};`
  } else if (currKeyboardConfig.value.emphasisTwoKeys.includes(code)) {
    style += `background-color: ${customEmphasisTwoBackgroundColor.value}; color: ${customEmphasisTwoFontColor.value};`
  }
  return style
}

const getKeycapStageStyle = (code: string) => {
  let style = ''
  if (localConfig.bookmark.keycapType === 'gmk') {
    // 调整KeycapStage居中，形成按键边缘遮盖效果
    style += `margin-top: -${customKeycapStageGmkMarginTop.value};margin-left: -${customKeycapStageGmkMarginLeft.value};`
    style += `width: ${getCustomKeycapWidth(code, -KeycapkeycapGmkEdgeHorizontalSize).value};`
    style += `height: ${customKeycapStageGmkHeight.value};`
    if (code === 'Space') {
      // 空格阴影效果
      style += 'background: linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 90%); background-color: inherit; border-radius;'
    }
  } else if (localConfig.bookmark.keycapType === 'dsa') {
    style += `margin: -${customKeycapStageDsaMargin.value};`
    style += `width: ${getCustomKeycapWidth(code, -KeycapkeycapDsaEdgeSize).value};`
    style += `height: ${customKeycapStageDsaHeight.value};`
    if (code === 'Space') {
      style += 'background: linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 90%); background-color: inherit;'
    }
  }
  return style
}

const getKeycapTextStyle = (code: string) => {
  const textAlign = getCustomTextAlign(code)
  let style = `text-align: ${textAlign};`
  if (textAlign !== 'center') {
    style += `padding: 0 ${customKeycapTextPadding.value};`
  }
  return style
}

const getKeycapIconStyle = (code: string) => {
  let textAlign = getCustomTextAlign(code)
  textAlign = TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP[textAlign]
  let style = `justify-content: ${textAlign};`
  if (localConfig.bookmark.isNameVisible) {
    if (textAlign !== 'center') {
      style += `padding: 0 ${customKeycapTextPadding.value};`
    }
  } else {
    style += `padding: ${customKeycapIconPadding.value};`
  }
  return style
}
</script>

<template>
  <MoveableComponentWrap v-model:dragStyle="dragStyle" componentName="bookmark">
    <div v-if="isRender" id="bookmark" data-target-type="1" data-target-name="bookmark">
      <div class="bookmark__container" :style="dragStyle || containerStyle">
        <div v-for="(rowItem, rowIndex) in currKeyboardConfig.list" :key="rowIndex" class="bookmark__row">
          <div v-for="code in rowItem" :key="code" class="row__keycap-wrap" :style="getKeycapWrapStyle(code)">
            <div
              class="row__keycap"
              :class="{
                'row__keycap-flat': localConfig.bookmark.keycapType === 'flat',
                'row__keycap-gmk': localConfig.bookmark.keycapType === 'gmk',
                'row__keycap-dsa': localConfig.bookmark.keycapType === 'dsa',
                'row__keycap--move': isDragMode,
                'row__keycap--hover': !isDragMode,
                'row__keycap--active': state.currSelectKeyCode === code,
                'row__keycap--border': localConfig.bookmark.isBorderEnabled,
              }"
              :style="getKeycapStyle(code)"
              :title="getBookmarkConfigUrl(code)"
              :data-code="code"
              @mousedown="onMouseDownKey($event, code, getBookmarkConfigUrl(code))"
            >
              <div
                class="keycap__stage"
                :class="{
                  'keycap__stage-flat': localConfig.bookmark.keycapType === 'flat',
                  'keycap__stage-gmk': localConfig.bookmark.keycapType === 'gmk',
                  'keycap__stage-dsa': localConfig.bookmark.keycapType === 'dsa',
                }"
                :style="getKeycapStageStyle(code)"
              >
                <div v-if="state.currSelectKeyCode === code && state.isLoadPageLoading" class="item__loading">
                  <eos-icons:loading />
                </div>
                <p class="item__key" :style="getKeycapTextStyle(code)">
                  {{ getKeycapLabel(code) }}
                </p>
                <div class="item__img" :style="getKeycapIconStyle(code)">
                  <div class="img__wrap">
                    <img
                      v-if="getBookmarkConfigUrl(code)"
                      class="img__main"
                      :src="getFaviconFromUrl(getBookmarkConfigUrl(code))"
                      :draggable="false"
                    >
                  </div>
                </div>
                <p v-if="localConfig.bookmark.isNameVisible" class="item__name" :style="getKeycapTextStyle(code)">
                  {{ getBookmarkConfigName(code) }}
                </p>
                <!-- 按键定位标志F & J -->
                <div v-if="['KeyF', 'KeyJ'].includes(code)" class="item__cursor" />
              </div>
            </div>
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
        padding: v-bind(customKeycapPadding);
        height: v-bind(customKeycapBaseSize);
        .row__keycap {
          position: relative;
          width: 100%;
          height: 100%;
          color: v-bind(customMainFontColor);
          background-color: v-bind(customMainBackgroundColor);
          border-radius: v-bind(customKeycapBorderRadius);
          border-style: solid;
          box-sizing: border-box;
          cursor: pointer;
          .keycap__stage {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            border-style: solid;
            color: inherit;
            background-color: inherit;
            .item__loading {
              z-index: 1;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              display: flex;
              justify-content: center;
              align-items: center;
              color: v-bind(customPrimaryColor);
              font-size: 190%;
            }
            .item__key {
              flex: 0 0 auto;
              padding-top: 1%;
              font-family: v-bind(customKeycapKeyFontFamily);
              font-size: v-bind(customKeycapKeyFontSize);
              text-align: center;
              font-weight: 500;
            }
            .item__img {
              flex: 1;
              height: 40%;
              display: flex;
              justify-content: center;
              align-items: center;
              .img__wrap {
                height: 100%;
                .img__main {
                  height: 100%;
                }
              }
            }
            .item__name {
              flex: 0 0 auto;
              text-align: center;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }
            .item__cursor {
              position: absolute;
              left: 50%;
              bottom: 0;
              transform: translate(-50%, 0);
              width: 25%;
              border: 1px solid v-bind(customMainFontColor);
            }
          }
          .keycap__stage-flat {
            padding: v-bind(customKeycapStageFlatPadding);
            border-radius: v-bind(customKeycapBorderRadius);
            border-width: 1px;
            border-color: rgba(0, 0, 0, 0.1);
            background: rgba(0, 0, 0, 0.1);
          }
          .keycap__stage-gmk {
            border-width: 0px;
            border-color: rgba(0, 0, 0, 0.1);
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
            border-bottom-right-radius: 8px 4px;
            border-bottom-left-radius: 8px 4px;
            background: linear-gradient(
              to right,
              rgba(255, 255, 255, 0.15) 0%,
              rgba(0, 0, 0, 0.12) 2%,
              rgba(255, 255, 255, 0.1) 90%,
              rgba(255, 255, 255, 0.1) 100%
            );
            box-shadow: 0 0 10px rgb(0 0 0 / 20%);
            background-color: inherit;
            color: inherit;
          }
          .keycap__stage-dsa {
            border-width: 0px;
            border-color: rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.15) 0%,
              rgba(0, 0, 0, 0.2) 3%,
              rgba(0, 0, 0, 0.2) 10%,
              rgba(255, 255, 255, 0.1) 80%,
              rgba(255, 255, 255, 0.1) 100%
            );
            background-color: inherit;
            color: inherit;
          }
        }
        .row__keycap-flat {
          /* border-width: 1px;
          border-color: black; */
        }
        .row__keycap-gmk {
          border-width: v-bind(customKeycapkeycapGmkTopBorderWidth) v-bind(customKeycapkeycapGmkHorizontalBorderWidth)
            v-bind(customKeycapkeycapGmkBottomBorderWidth);
          border-color: rgba(0, 0, 0, 0.03) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.22) rgba(100, 100, 100, 0.1);
          box-shadow: 0 0 5px rgb(0 0 0 / 50%);
        }
        .row__keycap-dsa {
          border-width: v-bind(customKeycapDsaBorderWidth);
          border-color: rgba(0, 0, 0, 0.03) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.18) rgba(100, 100, 100, 0.1);
          box-shadow: 0 0 5px rgb(0 0 0 / 50%);
        }
        .row__keycap--move {
          cursor: move !important;
        }
        .row__keycap--border {
          outline: v-bind(customBorderWidth) solid v-bind(customBorderColor);
        }
        .row__keycap--active {
          transform: translate(1px, 2px);
        }
        .row__keycap--hover:hover {
          transform: translate(1px, 2px);
        }
      }
    }
  }
}
</style>
