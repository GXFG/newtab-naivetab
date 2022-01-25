<template>
  <MoveableComponentWrap componentName="bookmark" @drag="(style) => (containerStyle = style)">
    <div v-if="isRender" id="bookmark" data-target-type="1" data-target-name="bookmark">
      <div class="bookmark__container" :style="containerStyle">
        <div v-for="(rowData, rowIndex) in keyBoardRowList" :key="rowIndex" class="bookmark__row">
          <div
            v-for="item in rowData"
            :key="item.key"
            class="row__item"
            :class="{
              'row__item--move': isDragMode,
              'row__item--hover': !isDragMode,
              'row__item--border': globalState.style.bookmark.isBorderEnabled,
              'row__item--shadow': globalState.style.bookmark.isShadowEnabled,
            }"
            :title="item.url"
            @click="onClickItem(item.url)"
            @mousedown="onItemMouseDown($event, item.url)"
          >
            <p class="item__key">
              {{ `${item.key.toUpperCase()}` }}
            </p>
            <div class="item__img">
              <div class="img__wrap">
                <img v-if="item.url" class="img__main" :src="`chrome://favicon/size/16@2x/${item.url}`" :ondragstart="() => false">
              </div>
            </div>
            <p class="item__name">
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
import { useThrottleFn } from '@vueuse/core'
import { useStorageLocal } from '@/composables/useStorageLocal'
import {
  KEYBOARD_KEY,
  KEY_OF_INDEX,
  MERGE_SETTING_DELAY,
  isDragMode,
  globalState,
  getIsComponentRender,
  getLayoutStyle,
  getStyleField,
  addKeyboardTask,
  sleep,
  log,
  createTab,
} from '@/logic'

const CNAME = 'bookmark'
const isRender = getIsComponentRender(CNAME)

interface bookmarkList {
  key: string
  url: string
  name?: string
}

const state = reactive({
  currSelectKey: '',
})

const isInitialized = useStorageLocal('data-bookmark-initialized', false)
const localBookmarkList = useStorageLocal('data-bookmark', [] as bookmarkList[])

const initBookmarkListData = () => {
  if (isInitialized.value) {
    return
  }
  KEYBOARD_KEY.forEach((key: string) => {
    localBookmarkList.value.push({
      key,
      url: '',
      name: '',
    })
  })
  isInitialized.value = true
}
initBookmarkListData()

const keyBoardRowList = computed(() => {
  return [localBookmarkList.value.slice(0, 10), localBookmarkList.value.slice(10, 19), localBookmarkList.value.slice(19)]
})

const mergeBookmarkSetting = useThrottleFn(async() => {
  log('Merge BookmarkSetting')
  if (!isInitialized) {
    await sleep(200)
  }
  for (const key of KEYBOARD_KEY) {
    const item = globalState.setting.bookmark.keymap[key]
    const index = KEY_OF_INDEX[key as keyof typeof KEY_OF_INDEX]
    if (!(item && (item.url || item.name))) {
      // 重置没有配置信息的按键数据
      localBookmarkList.value[index] = {
        key,
        url: '',
        name: '',
      }
      continue
    }
    const url = item.url.includes('//') ? item.url : `https://${item.url}`
    const domain = url.split('/')[2]
    let name = ''
    if (domain && !domain.includes(':')) {
      // 非端口地址
      const tempSplitList = domain.split('.')
      name = tempSplitList.includes('www') ? tempSplitList[1] : tempSplitList[0]
    }
    localBookmarkList.value[index] = {
      key,
      url,
      name: item.name ? item.name : name,
    }
  }
}, MERGE_SETTING_DELAY)

watch(
  () => globalState.setting.bookmark.keymap,
  () => {
    mergeBookmarkSetting()
  },
  { deep: true },
)

const onClickItem = (url: string) => {
  if (isDragMode.value) {
    return
  }
  createTab(url)
  state.currSelectKey = ''
}

const onItemMouseDown = (e: MouseEvent, url: string) => {
  if (e.button !== 1) {
    // 按下鼠标中键
    return
  }
  if (isDragMode.value) {
    return
  }
  createTab(url, false)
}

// keyboard listener
let timer = null as any
const keyboardTask = (e: KeyboardEvent) => {
  const { key } = e
  if (!(key in KEY_OF_INDEX)) {
    return
  }
  const index = KEY_OF_INDEX[key as keyof typeof KEY_OF_INDEX]
  const url = localBookmarkList.value[index].url
  if (url.length === 0) {
    return
  }
  if (!globalState.setting.bookmark.isDblclickOpen) {
    createTab(url)
    return
  }
  if (key === state.currSelectKey) {
    createTab(url)
  } else {
    state.currSelectKey = key
    clearTimeout(timer)
    timer = setTimeout(() => {
      state.currSelectKey = ''
    }, globalState.setting.bookmark.dblclickIntervalTime)
  }
}

addKeyboardTask(CNAME, keyboardTask)

const containerStyle = ref(getLayoutStyle(CNAME))
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
const customMargin = getStyleField(CNAME, 'margin', 'px')
const customWidth = getStyleField(CNAME, 'width', 'px')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customActiveColor = getStyleField(CNAME, 'activeColor')
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
      justify-content: center;
      align-items: center;
      &:nth-child(2) {
        margin-left: -5%;
      }
      &:nth-child(3) {
        margin-left: -16%;
      }
      .row__item--move {
        cursor: move !important;
      }
      .row__item--border {
        outline: 1px solid v-bind(customBorderColor);
      }
      .row__item--shadow {
        box-shadow: v-bind(customShadowColor) 0px 2px 1px, v-bind(customShadowColor) 0px 4px 2px, v-bind(customShadowColor) 0px 8px 4px,
          v-bind(customShadowColor) 0px 16px 8px;
      }
      .row__item--hover:hover {
        background-color: v-bind(customActiveColor) !important;
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
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-sizing: border-box;
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
