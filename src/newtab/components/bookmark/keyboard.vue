<template>
  <MoveableComponentWrap componentName="bookmark" @drag="(style) => (dragStyle = style)">
    <div v-if="isRender" id="bookmark" data-target-type="1" data-target-name="bookmark">
      <div class="bookmark__container" :style="dragStyle || containerStyle">
        <div v-for="(rowData, rowIndex) in keyboardRowList" :key="rowIndex" class="bookmark__row">
          <div
            v-for="item in rowData"
            :key="item.key"
            class="row__item"
            :class="{
              'row__item--move': isDragMode,
              'row__item--hover': !isDragMode && item.url.length !== 0,
              'row__item--active': state.currSelectKey === item.key,
              'row__item--border': localConfig.bookmark.isBorderEnabled,
              'row__item--shadow': localConfig.bookmark.isShadowEnabled,
            }"
            :title="item.url"
            @click="onClickKey(item.key, item.url)"
            @mousedown="onMouseDownKey($event, item.url)"
          >
            <div v-if="state.currSelectKey === item.key && state.isLoadPageLoading" class="item__loading">
              <eos-icons:loading />
            </div>
            <p class="item__key">
              {{ `${item.key.toUpperCase()}` }}
            </p>
            <div class="item__img">
              <div class="img__wrap">
                <img v-if="item.url" class="img__main" :src="getDomainIcon(item.url)" :ondragstart="() => false">
              </div>
            </div>
            <p v-if="localConfig.bookmark.isNameVisible" class="item__name">
              {{ item.name }}
            </p>
            <!-- 按键定位标志F & J -->
            <div v-if="['f', 'j'].includes(item.key)" class="item__cursor" />
          </div>
        </div>
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<script setup lang="ts">
import {
  KEYBOARD_KEY_LIST,
  KEYBOARD_CODE_TO_LABEL_MAP,
  isDragMode,
  localConfig,
  getIsComponentRender,
  getLayoutStyle,
  getStyleField,
  addKeyboardTask,
  createTab,
  getDomainIcon,
  localBookmarkList,
  keyboardRowList,
  initBookmarkListData,
} from '@/logic'

const CNAME = 'bookmark'
const isRender = getIsComponentRender(CNAME)

const state = reactive({
  currSelectKey: '',
  isLoadPageLoading: false,
})

onMounted(() => {
  initBookmarkListData()
})

const delayResetPressKey = () => {
  setTimeout(() => {
    state.currSelectKey = ''
  }, 200)
}

const openPage = (url: string, isBgOpen = false) => {
  if (isBgOpen) {
    // 后台打开
    createTab(url, false)
    delayResetPressKey()
    return
  }
  if (localConfig.bookmark.isNewTabOpen) {
    // 以新标签页打开
    createTab(url)
    delayResetPressKey()
    return
  }
  if (!/http/.test(url)) {
    // 非http协议只能以新标签页打开
    createTab(url)
    delayResetPressKey()
    return
  }
  // 当前标签页打开
  state.isLoadPageLoading = true
  window.$loadingBar.start()
  window.location.href = url
}

const onClickKey = (key: string, url: string) => {
  if (isDragMode.value || url.length === 0) {
    return
  }
  state.currSelectKey = KEYBOARD_CODE_TO_LABEL_MAP[key] || key
  openPage(url)
}

const onMouseDownKey = (e: MouseEvent, url: string) => {
  if (e.button !== 1) {
    return
  }
  // 按下鼠标中键
  if (isDragMode.value) {
    return
  }
  createTab(url, false)
}

// keyboard listener
let timer = null as any

const keyboardTask = (e: KeyboardEvent) => {
  const { code, shiftKey, ctrlKey, altKey, metaKey } = e
  let labelKey = KEYBOARD_CODE_TO_LABEL_MAP[code] || code
  if (/Key|Digit/.test(labelKey)) {
    // 处理字母和数字按键
    labelKey = labelKey.slice(-1).toLowerCase()
  }
  const index = KEYBOARD_KEY_LIST.indexOf(labelKey)
  if (index === -1) {
    return
  }
  if (ctrlKey || metaKey) {
    // 忽略ctrl/meta键
    return
  }
  const url = localBookmarkList.value[index].url
  if (url.length === 0) {
    return
  }
  // 按下shift/alt + key 可以后台打开书签
  const isBgOpenPage = shiftKey || altKey
  if (!localConfig.bookmark.isDblclickOpen) {
    state.currSelectKey = labelKey
    openPage(url, isBgOpenPage)
  } else {
    clearTimeout(timer)
    if (labelKey === state.currSelectKey) {
      openPage(url, isBgOpenPage)
    } else {
      state.currSelectKey = labelKey
      timer = setTimeout(() => {
        state.currSelectKey = ''
      }, localConfig.bookmark.dblclickIntervalTime)
    }
  }
}

addKeyboardTask(CNAME, keyboardTask)

const dragStyle = ref('')
const customPrimaryColor = getStyleField('general', 'primaryColor')
const containerStyle = getLayoutStyle(CNAME)
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
const customMargin = getStyleField(CNAME, 'margin', 'px')
const customHalfWidth = getStyleField(CNAME, 'width', 'px', 0.5)
const customWidth = getStyleField(CNAME, 'width', 'px')
const customTrebleHalfWidth = getStyleField(CNAME, 'width', 'px', 1.5)
const customBorderRadius = getStyleField(CNAME, 'borderRadius', 'px')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customBackgroundActiveColor = getStyleField(CNAME, 'backgroundActiveColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
</script>

<style scoped>
#bookmark {
  font-size: v-bind(customFontSize);
  font-family: v-bind(customFontFamily);
  user-select: none;
  .bookmark__container {
    z-index: 10;
    position: absolute;
    overflow: hidden;
    .bookmark__row {
      display: flex;
      align-items: center;
      &:nth-child(2) {
        margin-left: v-bind(customHalfWidth);
      }
      &:nth-child(3) {
        margin-left: v-bind(customWidth);
      }
      &:nth-child(4) {
        margin-left: v-bind(customTrebleHalfWidth);
      }
      .row__item--move {
        cursor: move !important;
      }
      .row__item--border {
        outline: v-bind(customBorderWidth) solid v-bind(customBorderColor);
      }
      .row__item--active {
        background-color: v-bind(customBackgroundActiveColor) !important;
      }
      .row__item--shadow {
        box-shadow: v-bind(customShadowColor) 0px 2px 1px, v-bind(customShadowColor) 0px 4px 2px, v-bind(customShadowColor) 0px 8px 4px,
          v-bind(customShadowColor) 0px 16px 8px;
      }
      .row__item--hover:hover {
        background-color: v-bind(customBackgroundActiveColor) !important;
      }
      .row__item {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        position: relative;
        margin: v-bind(customMargin);
        padding: 0.5%;
        width: v-bind(customWidth);
        height: v-bind(customWidth);
        text-align: center;
        color: v-bind(customFontColor);
        background-color: v-bind(customBackgroundColor);
        border-radius: v-bind(customBorderRadius);
        cursor: pointer;
        box-sizing: border-box;
        .item__loading {
          z-index: 1;
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          width: v-bind(customWidth);
          height: v-bind(customWidth);
          font-size: 220%;
          color: v-bind(customPrimaryColor);
          background-color: rgba(0, 0, 0, 0.1);
        }
        .item__key {
          flex: 0 0 auto;
          font-weight: 500;
        }
        .item__img {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          .img__wrap {
            width: 39%;
            .img__main {
              width: 100%;
              height: 100%;
            }
          }
        }
        .item__name {
          flex: 0 0 auto;
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .item__cursor {
          position: absolute;
          left: 50%;
          bottom: 4%;
          width: 25%;
          border: 1px solid v-bind(customBorderColor);
          transform: translate(-50%, 0);
        }
      }
    }
  }
}
</style>
