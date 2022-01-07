<template>
  <MoveableElement componentName="bookmark" @onDrag="(style) => (containerStyle = style)">
    <div v-if="isRender" id="bookmark" data-target-type="1" data-target-name="bookmark">
      <div class="bookmark__container" :style="containerStyle">
        <div v-for="(rowData, rowIndex) in keyBoardRowList" :key="rowIndex" class="bookmark__row">
          <div
            v-for="item in rowData"
            :key="item.key"
            :title="item.url"
            class="row__item"
            :class="{
              'row__item--move': isDragMode,
              'row__item--active': item.key === state.currSelectKey,
              'row__item--border': globalState.style.bookmark.isBorderEnabled,
              'row__item--shadow': globalState.style.bookmark.isShadowEnabled,
            }"
            :data-key="item.key"
            @mouseenter="handleContainerEnter"
            @mouseleave="handleContainerLeave"
            @click="onPressItem(item.url)"
          >
            <p class="item__key">
              {{ `${item.key.toUpperCase()}` }}
            </p>
            <div class="item__img">
              <div class="img__wrap">
                <img v-if="item.url" class="img__main" :src="`chrome://favicon/size/16@2x/${item.url}`" />
              </div>
            </div>
            <p class="item__name">
              {{ item.name }}
            </p>
            <!-- 按键定位标志F & J -->
            <div v-if="['f', 'j'].includes(item.key)" class="item__cursor"></div>
          </div>
        </div>
      </div>
    </div>
  </MoveableElement>
</template>

<script setup lang="ts">
import { useThrottleFn } from '@vueuse/core'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { KEYBOARD_KEY, KEY_OF_INDEX, MERGE_SETTING_DELAY, isDragMode, globalState, getIsComponentRender, getLayoutStyle, getStyleField, addKeyboardTask, sleep, log, openNewPage } from '@/logic'

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
    // 重置没有配置信息的按键
    if (!(item && (item.url || item.name))) {
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
      name = tempSplitList[tempSplitList.length - 2] // 默认name为主域名去掉后缀
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

const onPressItem = (url: string) => {
  if (isDragMode.value) {
    return
  }
  openNewPage(url)
  state.currSelectKey = ''
}

// 监听键盘按键
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
    openNewPage(url)
    return
  }
  if (key === state.currSelectKey) {
    openNewPage(url)
  } else {
    state.currSelectKey = key
    clearTimeout(timer)
    timer = setTimeout(() => {
      state.currSelectKey = ''
    }, globalState.setting.bookmark.dblclickIntervalTime)
  }
}

addKeyboardTask(CNAME, keyboardTask)

// 处理hover状态
const handleContainerEnter = (e: MouseEvent) => {
  if (isDragMode.value) {
    return
  }
  const el = e.target as HTMLInputElement
  state.currSelectKey = el.getAttribute('data-key') || ''
}
const handleContainerLeave = () => {
  state.currSelectKey = ''
}

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
      .row__item--active {
        background-color: v-bind(customActiveColor) !important;
      }
      .row__item--shadow {
        box-shadow: v-bind(customShadowColor) 0px 2px 1px, v-bind(customShadowColor) 0px 4px 2px, v-bind(customShadowColor) 0px 8px 4px, v-bind(customShadowColor) 0px 16px 8px;
      }
      .row__item {
        flex: 0 0 auto;
        position: relative;
        margin: v-bind(customMargin);
        padding: 0.8%;
        width: v-bind(customWidth);
        height: v-bind(customWidth);
        text-align: center;
        border-radius: 4px;
        color: v-bind(customFontColor);
        background-color: v-bind(customBackgroundColor);
        cursor: pointer;
        transition: all 0.3s ease;
        .item__key {
        }
        .item__img {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 4%;
          .img__wrap {
            width: 39%;
            .img__main {
              width: 100%;
              height: 100%;
            }
          }
        }
        .item__name {
          margin-top: 5%;
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
