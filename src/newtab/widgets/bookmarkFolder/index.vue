<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { createTab } from '@/logic/utils/common'
import { getFaviconFromUrl } from '@/logic/bookmark/api'
import { requestPermission } from '@/logic/utils/permission'
import { localConfig } from '@/logic/config/state'
import { getStyleField, getIsWidgetRender } from '@/logic/store/style'
import { isDragMode } from '@/logic/moveable'
import { addKeydownTask, removeKeydownTask } from '@/logic/task'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'
import { initData, state } from './logic'

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
const customItemBorderRadius = getStyleField(
  WIDGET_CODE,
  'itemBorderRadius',
  'vmin',
)
const customItemHeight = getStyleField(WIDGET_CODE, 'itemHeight', 'px')
const customIconSize = getStyleField(WIDGET_CODE, 'iconSize', 'px')

const bookmarkFolderStyle = computed(() => ({
  '--nt-bf-font-family': customFontFamily.value,
  '--nt-bf-font-color': customFontColor.value,
  '--nt-bf-font-size': customFontSize.value,
  '--nt-bf-padding': customPadding.value,
  '--nt-bf-width': customWidth.value,
  '--nt-bf-height': customHeight.value,
  '--nt-bf-border-radius': customBorderRadius.value,
  '--nt-bf-border-width': customBorderWidth.value,
  '--nt-bf-border-color': customBorderColor.value,
  '--nt-bf-background-color': customBackgroundColor.value,
  '--nt-bf-shadow-color': customShadowColor.value,
  '--nt-bf-background-blur': customBackgroundBlur.value,
  '--nt-bf-item-gap': customItemGap.value,
  '--nt-bf-item-border-radius': customItemBorderRadius.value,
  '--nt-bf-item-height': customItemHeight.value,
  '--nt-bf-icon-size': customIconSize.value,
}))

const isRender = getIsWidgetRender(WIDGET_CODE)

const requestBookmarkAccess = async () => {
  const granted = await requestPermission('bookmarks')
  if (granted) {
    initData()
  }
}

const findTargetFolder = (
  folder: BookmarkNode[],
  stack: string[],
): BookmarkNode[] => {
  try {
    if (stack.length === 0) {
      return folder
    }
    const target = folder.find((i) => i.title === stack[0])
      ?.children as BookmarkNode[]
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
  return (
    findTargetFolder(state.systemBookmarks, state.selectedFolderTitles) || []
  )
})

const isBookmarkNode = (
  node: BookmarkNode,
): node is BookmarkNode & { url: string } =>
  !Object.prototype.hasOwnProperty.call(node, 'children')

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
  if (isBookmarkNode(item)) {
    openBookmark(item.url || '')
  } else {
    state.selectedFolderTitles.push(item.title)
  }
}

const onBack = () => {
  if (isDragMode.value) {
    return
  }
  state.selectedFolderTitles.pop()
}

const keyboardTask = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    onBack()
  }
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeKeydownTask(WIDGET_CODE)
      return
    }
    initData()
    addKeydownTask(WIDGET_CODE, keyboardTask)
  },
  { immediate: true },
)
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="bookmarkFolder__container"
      :style="bookmarkFolderStyle"
      :class="{
        'bookmarkFolder__container--border':
          localConfig.bookmarkFolder.isBorderEnabled,
        'bookmarkFolder__container--shadow':
          localConfig.bookmarkFolder.isShadowEnabled,
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
        <div class="folder__permission-text">
          {{ $t('browserPermission.bookmark') }}
        </div>
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
        :style="{
          gridTemplateColumns: `repeat(${localConfig.bookmarkFolder.gridColumns}, 1fr)`,
        }"
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
          <div class="folder__label">
            {{
              state.selectedFolderTitles[state.selectedFolderTitles.length - 1]
            }}
          </div>
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
              :src="getFaviconFromUrl(isBookmarkNode(item) ? item.url : '')"
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
@keyframes folder-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

#bookmarkFolder {
  user-select: none;

  .bookmarkFolder__container {
    z-index: 10;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--nt-bf-font-family);
    color: var(--nt-bf-font-color);
    font-size: var(--nt-bf-font-size);
    padding: var(--nt-bf-padding);
    width: var(--nt-bf-width);
    height: var(--nt-bf-height);
    background: var(--nt-bf-background-color);
    border-radius: var(--nt-bf-border-radius);
    backdrop-filter: blur(var(--nt-bf-background-blur)) saturate(1.4);
    overflow: hidden;
    will-change: transform;
    transform: translateZ(0);
    /* 内高光，增加玻璃质感 */
    &::before {
      content: '';
      pointer-events: none;
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(
        160deg,
        rgba(255, 255, 255, 0.12) 0%,
        rgba(255, 255, 255, 0.04) 40%,
        transparent 70%
      );
      z-index: 0;
    }
  }
  .bookmarkFolder__container--border {
    border-style: solid;
    border-width: var(--nt-bf-border-width);
    border-color: var(--nt-bf-border-color);
  }
  .bookmarkFolder__container--shadow {
    box-shadow:
      0 4px 24px var(--nt-bf-shadow-color),
      0 1px 4px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .folder__grid {
    position: relative;
    z-index: 1;
    display: grid;
    gap: var(--nt-bf-item-gap);
    grid-auto-rows: var(--nt-bf-item-height);
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
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.07);
    border-radius: var(--nt-bf-item-border-radius);
    border: 1px solid rgba(255, 255, 255, 0.08);
    user-select: none;
    transition:
      transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
      background 0.15s ease,
      box-shadow 0.15s ease,
      border-color 0.15s ease;
    /* 内高光线 */
    &::after {
      content: '';
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.25),
        transparent
      );
      border-radius: 50%;
    }
  }
  .folder__item--pointer {
    cursor: pointer;
  }
  .folder__item--hover:hover {
    transform: translateY(-2px) scale(1.03);
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.18);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.18),
      0 1px 4px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }
  .folder__item--hover:active {
    transform: translateY(0px) scale(0.97);
    transition-duration: 0.08s;
    background: rgba(255, 255, 255, 0.05);
  }

  .folder__icon {
    width: min(var(--nt-bf-icon-size), 80%);
    height: min(var(--nt-bf-icon-size), 80%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      border-radius: 20%;
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.25),
        0 0 0 1px rgba(255, 255, 255, 0.06);
    }
    svg,
    .iconify {
      width: 100%;
      height: 100%;
      display: block;
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
    }
  }
  .folder__label {
    margin-top: 4px;
    padding: 0 4px;
    text-align: center;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.2px;
  }

  /* 返回按钮特殊样式 */
  .folder__item:first-child:has(.folder__icon .iconify) {
    background: rgba(255, 255, 255, 0.04);
    border-style: dashed;
    border-color: rgba(255, 255, 255, 0.12);
  }

  .folder__loading {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  .folder__loading-icon {
    font-size: 22px;
    opacity: 0.7;
    animation: folder-spin 1s linear infinite;
  }

  .folder__permission {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    height: 100%;
  }
  .folder__permission-text {
    font-size: 0.9em;
    opacity: 0.75;
    text-align: center;
    padding: 0 12px;
  }
  .folder__permission-btn {
    padding: 6px 16px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(4px);
    color: inherit;
    cursor: pointer;
    font-size: 0.85em;
    letter-spacing: 0.3px;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.12s ease;
    &:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.4);
      transform: translateY(-1px);
    }
    &:active {
      transform: translateY(0);
    }
  }
}
</style>
