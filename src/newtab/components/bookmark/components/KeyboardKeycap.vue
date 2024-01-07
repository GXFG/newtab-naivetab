<script setup lang="ts">
import { TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP } from '@/logic/const'
import { isDragMode } from '@/logic/moveable'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG, SPACE_KEYCODE_LIST, currKeyboardConfig } from '@/logic/keyboard'
import { state as bookmarkState, openPage, getFaviconFromUrl, handleSpecialKeycapExec, getKeycapType, getKeycapName, getKeycapUrl, getCustomKeycapWidth } from '@/logic/bookmark'
import { localConfig, getStyleField } from '@/logic/store'

const CNAME = 'bookmark'

const props = defineProps({
  keyCode: {
    type: String,
    required: true,
  },
})

const keycapLabel = computed(() => {
  let defaultLabel = KEYBOARD_CODE_TO_DEFAULT_CONFIG[props.keyCode].label
  const customLabel = currKeyboardConfig.value.custom[props.keyCode] && currKeyboardConfig.value.custom[props.keyCode].label
  if (customLabel) {
    defaultLabel = customLabel
  }
  return defaultLabel
})

const keycapName = computed(() => getKeycapName(props.keyCode))
const keycapBookmarkUrl = computed(() => getKeycapUrl(props.keyCode))
const keycapType = computed(() => getKeycapType(props.keyCode))

const onMouseDownKey = (event: MouseEvent, keyCode: string) => {
  if (isDragMode.value) {
    return
  }
  const { button, shiftKey, altKey } = event
  // 忽略鼠标右键
  if (button === 2) {
    return
  }
  const isHandled = handleSpecialKeycapExec(keyCode, keycapType.value)
  if (isHandled) {
    return
  }
  const url = keycapBookmarkUrl.value
  if (url.length === 0) {
    return
  }
  if (button === 0) {
    // 按下鼠标左键
    bookmarkState.currSelectKeyCode = keyCode
    openPage(url, shiftKey, altKey) // shift + 点击key后台打开书签，alt + key 新标签页打开
  } else if (button === 1) {
    // 按下鼠标中键
    openPage(url, true)
  }
}
const customPrimaryColor = getStyleField('general', 'primaryColor')

const customKeycapKeyFontFamily = getStyleField(CNAME, 'keycapKeyFontFamily')
const customKeycapKeyFontSize = getStyleField(CNAME, 'keycapKeyFontSize', 'vmin')
const customBookmarkFaviconSize = getStyleField(CNAME, 'faviconSize')

// keycap-base
const customKeycapBorderRadius = getStyleField(CNAME, 'keycapBorderRadius', 'vmin')
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

const customBorderWidth = getStyleField(CNAME, 'keycapBorderWidth', 'px')
const customBorderColor = getStyleField(CNAME, 'keycapBorderColor')

const getCustomTextAlign = (code: string) => {
  let value = KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].textAlign
  const customTextAlign = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].textAlign
  if (customTextAlign) {
    value = customTextAlign
  }
  return value
}

const keycapStyle = computed(() => {
  let style = ''
  // 键帽强调色
  if (currKeyboardConfig.value.emphasisOneKeys.includes(props.keyCode)) {
    style += `background-color: ${customEmphasisOneBackgroundColor.value}; color: ${customEmphasisOneFontColor.value};`
  } else if (currKeyboardConfig.value.emphasisTwoKeys.includes(props.keyCode)) {
    style += `background-color: ${customEmphasisTwoBackgroundColor.value}; color: ${customEmphasisTwoFontColor.value};`
  }
  return style
})

const keycapStageStyle = computed(() => {
  let style = ''
  if (localConfig.bookmark.keycapType === 'gmk') {
    // 调整KeycapStage居中，形成按键边缘遮盖效果
    style += `margin-top: -${customKeycapStageGmkMarginTop.value};margin-left: -${customKeycapStageGmkMarginLeft.value};`
    style += `width: ${getCustomKeycapWidth(props.keyCode, -KeycapkeycapGmkEdgeHorizontalSize).value};`
    style += `height: ${customKeycapStageGmkHeight.value};`
    // 空格阴影效果
    if (SPACE_KEYCODE_LIST.includes(props.keyCode)) {
      style += 'background: linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 90%); background-color: inherit; border-radius;'
    }
  } else if (localConfig.bookmark.keycapType === 'dsa') {
    style += `margin: -${customKeycapStageDsaMargin.value};`
    style += `width: ${getCustomKeycapWidth(props.keyCode, -KeycapkeycapDsaEdgeSize).value};`
    style += `height: ${customKeycapStageDsaHeight.value};`
    // 空格阴影效果
    if (SPACE_KEYCODE_LIST.includes(props.keyCode)) {
      style += 'background: linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 90%); background-color: inherit;'
    }
  }
  return style
})

const keycapTextStyle = computed(() => {
  const textAlign = getCustomTextAlign(props.keyCode)
  let style = `text-align: ${textAlign};`
  if (textAlign !== 'center') {
    style += `padding: 0 ${customKeycapTextPadding.value};`
  }
  return style
})

const keycapIconStyle = computed(() => {
  let textAlign = getCustomTextAlign(props.keyCode)
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
})

const rowKeycapClassName = computed(() => {
  const className = [`row__keycap-${localConfig.bookmark.keycapType}`]
  className.push(isDragMode.value ? 'row__keycap--move' : 'row__keycap--hover')
  if (bookmarkState.currSelectKeyCode === props.keyCode) {
    className.push('row__keycap--active')
  }
  if (localConfig.bookmark.isKeycapBorderEnabled) {
    className.push('row__keycap--border')
  }
  return className
})

const keycapStageClassName = computed(() => {
  const className = [`keycap__stage-${localConfig.bookmark.keycapType}`]
  return className
})
</script>

<template>
  <div
    class="row__keycap"
    :class="rowKeycapClassName"
    :style="keycapStyle"
    :data-code="keyCode"
    :title="`${keycapName} ${keycapBookmarkUrl}`"
    @mousedown="onMouseDownKey($event, keyCode)"
  >
    <div
      class="keycap__stage"
      :class="keycapStageClassName"
      :style="keycapStageStyle"
    >
      <div
        v-if="bookmarkState.isLoadPageLoading && bookmarkState.currSelectKeyCode === keyCode"
        class="item__loading"
      >
        <eos-icons:loading />
      </div>

      <!-- keycap -->
      <p
        v-if="localConfig.bookmark.isCapKeyVisible"
        class="item__key"
        :style="keycapTextStyle"
      >
        {{ keycapLabel || '&nbsp;' }}
      </p>

      <!-- favicon -->
      <div
        class="item__img"
        :style="keycapIconStyle"
      >
        <div
          v-if="localConfig.bookmark.isFaviconVisible"
          class="img__wrap"
        >
          <img
            v-if="keycapType === 'mark'"
            class="img__icon"
            :src="getFaviconFromUrl(keycapBookmarkUrl)"
            :draggable="false"
          />
          <div
            v-else
            class="img__type"
          >
            <template v-if="keycapType === 'folder'">
              <ic:outline-folder class="type__icon" />
            </template>
            <template v-else-if="keycapType === 'back' && bookmarkState.selectedFolderTitleStack.length !== 0">
              <material-symbols:arrow-back-rounded class="type__icon" />
            </template>
          </div>
        </div>
      </div>

      <!-- name -->
      <p
        v-if="localConfig.bookmark.isNameVisible"
        class="item__name"
        :style="keycapTextStyle"
      >
        {{ keycapName || '&nbsp;' }}
      </p>

      <!-- 按键触摸点F & J -->
      <div
        v-if="localConfig.bookmark.isTactileBumpsVisible && ['KeyF', 'KeyJ'].includes(keyCode)"
        class="item__tactile_bumps"
      />
    </div>
  </div>
</template>

<style scoped>
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
        transform: scale(v-bind(customBookmarkFaviconSize));
        .img__type {
          height: 100%;
          .type__icon {
            width: 100%;
            height: 100%;
          }
        }
        .img__icon {
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
    .item__tactile_bumps {
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
    background: linear-gradient(to right, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.12) 2%, rgba(255, 255, 255, 0.1) 90%, rgba(255, 255, 255, 0.1) 100%);
    box-shadow: 0 0 10px rgb(0 0 0 / 20%);
    background-color: inherit;
    color: inherit;
  }
  .keycap__stage-dsa {
    border-width: 0px;
    border-color: rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.2) 3%, rgba(0, 0, 0, 0.2) 10%, rgba(255, 255, 255, 0.1) 80%, rgba(255, 255, 255, 0.1) 100%);
    background-color: inherit;
    color: inherit;
  }
}
.row__keycap-flat {
  /* border-width: 1px;
          border-color: black; */
}
.row__keycap-gmk {
  border-width: v-bind(customKeycapkeycapGmkTopBorderWidth) v-bind(customKeycapkeycapGmkHorizontalBorderWidth) v-bind(customKeycapkeycapGmkBottomBorderWidth);
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
</style>
