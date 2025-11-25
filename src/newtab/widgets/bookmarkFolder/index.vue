<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { createTab } from '@/logic/util'
import { getFaviconFromUrl } from '@/logic/bookmark'
import { requestPermission } from '@/logic/storage'
import { localConfig, getStyleField } from '@/logic/store'
import { isDragMode } from '@/logic/moveable'
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'
import { initData, state } from './logic'

const requestBookmarkAccess = async () => {
  const granted = await requestPermission('bookmarks')
  if (granted) {
    initData()
  }
}

const findTargetFolder = (folder: BookmarkNode[], stack: string[]): BookmarkNode[] => {
  try {
    if (stack.length === 0) {
      return folder
    }
    const target = folder.find((i) => i.title === stack[0])?.children as BookmarkNode[]
    return findTargetFolder(target || [], stack.slice(1))
  } catch {
    return []
  }
}

const currFolderBookmarks = computed(() => {
  if (state.systemBookmarks.length === 0) {
    return [] as BookmarkNode[]
  }
  if (state.selectedFolderTitles.length === 0) {
    return state.systemBookmarks
  }
  return findTargetFolder(state.systemBookmarks, state.selectedFolderTitles) || []
})

const openBookmark = (url: string) => {
  if (!url) {
    return
  }
  if (localConfig.bookmarkFolder.isNewTabOpen) {
    createTab(url)
    return
  }
  window.location.href = url
}

const onClickItem = (item: BookmarkNode) => {
  if (isDragMode.value) {
    return
  }
  const isFolder = Object.prototype.hasOwnProperty.call(item, 'children')
  if (isFolder) {
    state.selectedFolderTitles.push(item.title)
    return
  }
  openBookmark((item as any).url || '')
}

const onBack = () => {
  if (isDragMode.value) {
    return
  }
  state.selectedFolderTitles.pop()
}

onMounted(() => {
  initData()
  addKeydownTask(WIDGET_CODE, (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      onBack()
    }
  })
})

onUnmounted(() => {
  removeKeydownTask(WIDGET_CODE)
})

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customPadding = getStyleField(WIDGET_CODE, 'padding', 'vmin')
const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')
const customItemGap = getStyleField(WIDGET_CODE, 'itemGap', 'px')
const customItemBorderRadius = getStyleField(WIDGET_CODE, 'itemBorderRadius', 'vmin')
const customItemHeight = getStyleField(WIDGET_CODE, 'itemHeight', 'px')
const customIconSize = getStyleField(WIDGET_CODE, 'iconSize', 'px')
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="bookmarkFolder__container"
      :class="{
        'bookmarkFolder__container--border': localConfig.bookmarkFolder.isBorderEnabled,
        'bookmarkFolder__container--shadow': localConfig.bookmarkFolder.isShadowEnabled,
      }"
    >
      <!-- loading -->
      <div
        v-if="state.isGetBookmarkLoading"
        class="folder__loading"
      >
        <Icon
          :icon="ICONS.loading"
          class="folder__loading-icon"
        />
      </div>
      <!-- permission -->
      <div
        v-else-if="state.isNoPermission"
        class="folder__permission"
      >
        <div class="folder__permission-text">{{ $t('permission.bookmark') }}</div>
        <button
          class="folder__permission-btn"
          @click="requestBookmarkAccess"
        >
          {{ $t('common.allow') }}
        </button>
      </div>
      <!-- grid -->
      <div
        v-else
        class="folder__grid"
        :style="{ gridTemplateColumns: `repeat(${localConfig.bookmarkFolder.gridColumns}, 1fr)` }"
      >
        <!-- back -->
        <div
          v-if="state.selectedFolderTitles.length > 0"
          class="folder__item"
          :class="{
            'folder__item--pointer': !isDragMode,
            'folder__item--hover': !isDragMode,
          }"
          @click="onBack"
        >
          <div class="folder__icon">
            <Icon :icon="ICONS.arrowBackRounded" />
          </div>
          <div class="folder__label">{{ state.selectedFolderTitles[state.selectedFolderTitles.length - 1] }}</div>
        </div>

        <div
          v-for="(item, idx) in currFolderBookmarks"
          :key="`${item.id}-${idx}`"
          class="folder__item"
          :class="{
            'folder__item--pointer': !isDragMode,
            'folder__item--hover': !isDragMode,
          }"
          :title="`${item.title} · ${item.url}`"
          @click="onClickItem(item)"
        >
          <div class="folder__icon">
            <Icon
              v-if="item.children && localConfig.bookmarkFolder.isIconVisible"
              :icon="ICONS.folderOutline"
            />
            <img
              v-else-if="localConfig.bookmarkFolder.isIconVisible"
              :src="getFaviconFromUrl((item as any).url || '')"
              :draggable="false"
              alt=""
            />
          </div>

          <div
            v-if="localConfig.bookmarkFolder.isNameVisible"
            class="folder__label"
          >
            {{ item.title }}
          </div>
        </div>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#bookmarkFolder {
  user-select: none;
  .bookmarkFolder__container {
    z-index: 10;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: v-bind(customFontFamily);
    color: v-bind(customFontColor);
    font-size: v-bind(customFontSize);
    padding: v-bind(customPadding);
    width: v-bind(customWidth);
    height: v-bind(customHeight);
    background: v-bind(customBackgroundColor);
    border-radius: v-bind(customBorderRadius);
    backdrop-filter: blur(v-bind(customBackgroundBlur));
    overflow: hidden;
  }
  .bookmarkFolder__container--border {
    border-style: solid;
    border-width: v-bind(customBorderWidth);
    border-color: v-bind(customBorderColor);
  }
  .bookmarkFolder__container--shadow {
    box-shadow: 0 1px 6px v-bind(customShadowColor);
  }

  .folder__grid {
    display: grid;
    gap: v-bind(customItemGap);
    grid-auto-rows: v-bind(customItemHeight);
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .folder__grid::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .folder__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.08);
    border-radius: v-bind(customItemBorderRadius);
    user-select: none;
    transition: transform 0.15s ease;
  }
  .folder__item--pointer {
    cursor: pointer;
  }
  .folder__item--hover:hover {
    transform: translateY(-1px);
  }

  .folder__icon {
    width: min(v-bind(customIconSize), 80%);
    height: min(v-bind(customIconSize), 80%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      border-radius: 4px;
    }
    svg,
    .iconify {
      width: 100%;
      height: 100%;
      display: block;
    }
  }
  .folder__label {
    margin-top: 4px;
    text-align: center;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .folder__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  .folder__loading-icon {
    font-size: 22px;
  }

  .folder__permission {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 100%;
  }
  .folder__permission-btn {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(0, 0, 0, 0.15);
    color: inherit;
    cursor: pointer;
  }
}
</style>
