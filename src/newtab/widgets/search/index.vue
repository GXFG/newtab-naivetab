<script setup lang="ts">
import NTScrollArea from '@/components/ui/NTScrollArea.vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { useDebounceFn, onClickOutside } from '@vueuse/core'
import { gaProxy } from '@/logic/utils/gtag'
import { createTab, sleep, log } from '@/logic/utils/common'
import { getSearchSuggestion } from '@/api'
import { SEARCH_ENGINE_LIST } from '@/logic/constants/search'
import { isDragMode } from '@/logic/moveable'
import { localConfig } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'
import { getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

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
const customDropdownBorderRadius = getStyleField(
  WIDGET_CODE,
  'dropdownBorderRadius',
  'vmin',
)
const customDropdownBackgroundColor = getStyleField(
  WIDGET_CODE,
  'dropdownBackgroundColor',
)
const customDropdownFontFamily = getStyleField(
  WIDGET_CODE,
  'dropdownFontFamily',
)
const customDropdownFontColor = getStyleField(WIDGET_CODE, 'dropdownFontColor')
const customDropdownFontSize = getStyleField(
  WIDGET_CODE,
  'dropdownFontSize',
  'vmin',
)

/**
 * 获取当前搜索引擎图标
 * - 自定义图标优先
 * - 已知引擎从 faviconUrl 读取
 * - 自定义引擎从域名根目录获取 favicon
 */
const currEngineIcon = computed(() => {
  if (localConfig.search.searchEngineIconUrl) {
    return localConfig.search.searchEngineIconUrl
  }
  const urlName = localConfig.search.urlName
  if (urlName === 'custom') {
    try {
      const { origin } = new URL(localConfig.search.urlValue)
      return `${origin}/favicon.ico`
    } catch {
      return ''
    }
  }
  return SEARCH_ENGINE_LIST.find((e) => e.label === urlName)?.faviconUrl ?? ''
})

// 自定义下拉框 ref
const dropdownRef = ref<HTMLElement | null>(null)

/**
 * 下拉框外部点击关闭
 * - dropdownRef 初始为 null（v-if 控制渲染），VueUse onClickOutside 安全处理 null ref
 * - 回调设为 false 是幂等操作：dropdown 未显示时赋值 false 无副作用
 */
onClickOutside(dropdownRef, () => {
  state.isSuggestVisible = false
})

const searchStyle = computed(() => ({
  '--nt-s-font-family': customFontFamily.value,
  '--nt-s-font-color': customFontColor.value,
  '--nt-s-font-size': customFontSize.value,
  '--nt-s-padding': customPadding.value,
  '--nt-s-width': customWidth.value,
  '--nt-s-height': customHeight.value,
  '--nt-s-border-radius': customBorderRadius.value,
  '--nt-s-border-width': customBorderWidth.value,
  '--nt-s-border-color': customBorderColor.value,
  '--nt-s-background-color': customBackgroundColor.value,
  '--nt-s-shadow-color': customShadowColor.value,
  '--nt-s-background-blur': customBackgroundBlur.value,
  '--nt-s-dropdown-radius': customDropdownBorderRadius.value,
  '--nt-s-dropdown-bg-color': customDropdownBackgroundColor.value,
  '--nt-s-dropdown-font-family': customDropdownFontFamily.value,
  '--nt-s-dropdown-font-color': customDropdownFontColor.value,
  '--nt-s-dropdown-font-size': customDropdownFontSize.value,
}))

const state = reactive({
  searchValue: '',
  isSuggestVisible: false,
  isSuggestLoading: false,
  isSuggestSelecting: false,
  isSearching: false,
  currSuggestIndex: -1,
  suggestList: [] as { label: string; key: string }[],
})

const onSearch = () => {
  if (state.searchValue.length === 0) {
    return
  }
  const encodeText = encodeURIComponent(state.searchValue)
  const searchUrl = localConfig.search.urlValue.replace('{query}', encodeText)
  state.isSuggestVisible = false
  state.isSuggestSelecting = false
  state.currSuggestIndex = -1
  gaProxy('click', ['search', 'onSearch'])
  if (localConfig.search.isNewTabOpen) {
    state.isSearching = true
    createTab(searchUrl)
    setTimeout(() => {
      state.isSearching = false
    }, 600)
    state.searchValue = ''
    return
  }
  // 当前标签页打开
  window.location.href = searchUrl
}

const handleSelectSuggest = (key: string) => {
  state.searchValue = key
  onSearch()
}

const handleSearchFocus = () => {
  globalState.isSearchFocused = true
  state.isSuggestVisible = true
}

const handleSearchBlur = () => {
  globalState.isSearchFocused = false
  state.isSuggestVisible = false
  state.isSuggestSelecting = false
  state.currSuggestIndex = -1
}

const handleSearchInput = () => {
  if (isDragMode.value) {
    state.searchValue = ''
    return
  }
  state.isSuggestVisible = true
  if (state.isSuggestSelecting) {
    return
  }
  state.currSuggestIndex = -1
}

const handleSearchKeydown = (e: KeyboardEvent) => {
  const { code, isComposing } = e
  if (isComposing) {
    return
  }
  if (['Enter', 'NumpadEnter'].includes(code)) {
    onSearch()
    return
  }
  if (['ArrowUp', 'ArrowDown'].includes(code)) {
    if (!state.isSuggestVisible || state.suggestList.length === 0) {
      return
    }
    e.preventDefault()
    state.isSuggestSelecting = true
    if (code === 'ArrowUp') {
      state.currSuggestIndex = Math.max(0, state.currSuggestIndex - 1)
    } else {
      state.currSuggestIndex = Math.min(
        state.suggestList.length - 1,
        state.currSuggestIndex + 1,
      )
    }
    state.searchValue = state.suggestList[state.currSuggestIndex].label
    // debounce 窗口 300ms，延迟 350ms 清除标志确保 watcher + debounce 都已跳过
    setTimeout(() => {
      state.isSuggestSelecting = false
    }, 350)
  }
}

const onClearValue = async () => {
  state.isSuggestVisible = false
  state.isSuggestSelecting = false
  state.currSuggestIndex = -1
  state.searchValue = ''
  await sleep(150)
  state.suggestList = []
}

/**
 * 搜索建议获取：根据当前搜索引擎匹配对应的 suggest API。
 * 扩展环境不受 CORS 限制，可直接调用各引擎的 suggestion 接口。
 * 无 suggestUrl 的引擎（Github/Qwant/Yahoo/自定义）回退百度。
 */
const getSearchSuggest = async () => {
  if (state.searchValue.length === 0 || state.isSuggestSelecting) {
    return
  }
  state.isSuggestLoading = true
  try {
    const engine = SEARCH_ENGINE_LIST.find(
      (e) => e.label === localConfig.search.urlName,
    )
    const results = await getSearchSuggestion(
      engine?.label ?? 'Baidu',
      engine?.suggestUrl,
      state.searchValue,
    )
    state.suggestList = results
      .map((label) => ({ label, key: label }))
      .slice(0, localConfig.search.dropdownMaxItems)
  } catch (error) {
    log('search suggestion error:', error)
    state.suggestList = []
  } finally {
    state.isSuggestLoading = false
  }
}

const getSearchSuggestHandler = useDebounceFn(getSearchSuggest, 300)

watch(
  () => state.searchValue,
  () => {
    if (!localConfig.search.suggestionEnabled) {
      return
    }
    if (state.searchValue.length === 0) {
      onClearValue()
      return
    }
    // 键盘导航中不发请求，只响应用户手动输入
    if (state.isSuggestSelecting) {
      return
    }
    getSearchSuggestHandler()
  },
)

watch(isDragMode, () => {
  onClearValue()
})
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      ref="dropdownRef"
      class="search__container"
      :style="searchStyle"
      :class="{
        'search__container--focus':
          localConfig.search.isBorderEnabled && globalState.isSearchFocused,
        'search__container--border': localConfig.search.isBorderEnabled,
        'search__container--shadow': localConfig.search.isShadowEnabled,
      }"
    >
      <img
        v-if="localConfig.search.isSearchEngineIconVisible && currEngineIcon"
        class="search__engine-icon"
        :class="{ 'search__engine-icon--move': isDragMode }"
        :src="currEngineIcon"
        alt=""
      />
      <div class="search__input-wrap">
        <input
          v-model="state.searchValue"
          type="text"
          class="search__input"
          :class="{ 'search__input--move': isDragMode }"
          :placeholder="
            localConfig.search.placeholder || localConfig.search.urlName
          "
          @focus="handleSearchFocus"
          @blur="handleSearchBlur"
          @input="handleSearchInput"
          @keydown="handleSearchKeydown"
        />
        <button
          v-if="state.searchValue"
          type="button"
          class="input__clear"
          @click="onClearValue"
        >
          <Icon :icon="ICONS.closeCircleLine" />
        </button>
      </div>
      <Transition name="search-dropdown">
        <div
          v-if="
            localConfig.search.suggestionEnabled &&
            state.isSuggestVisible &&
            state.suggestList.length !== 0
          "
          class="search__dropdown"
        >
          <NTScrollArea>
            <div
              v-for="(item, index) in state.suggestList"
              :key="item.key"
              class="search__dropdown-item"
              :class="{
                'search__dropdown-item--pending':
                  state.currSuggestIndex === index,
              }"
              @mousedown.prevent="handleSelectSuggest(item.key)"
            >
              {{ item.label }}
            </div>
          </NTScrollArea>
        </div>
      </Transition>
      <button
        v-if="localConfig.search.iconEnabled"
        type="button"
        class="input__search"
        :class="{ 'input__search--move': isDragMode }"
        :disabled="state.isSearching"
        @click="onSearch"
      >
        <Icon
          :icon="ICONS.searchAction"
          class="search__icon"
        />
      </button>
    </div>
  </WidgetWrap>
</template>

<style>
#search {
  font-family: var(--nt-s-font-family);
  user-select: none;

  .search__container {
    z-index: var(--nt-z-index);
    position: absolute;
    width: var(--nt-s-width);
    padding: 0 var(--nt-s-padding);
    display: flex;
    align-items: center;
    border-radius: var(--nt-s-border-radius);
    background-color: var(--nt-s-background-color);
    backdrop-filter: blur(var(--nt-s-background-blur)) saturate(1.4);
    overflow: visible;
    will-change: transform;
    transform: translateZ(0);
    transition:
      box-shadow 0.3s cubic-bezier(0.34, 1.06, 0.64, 1),
      border-color 0.3s cubic-bezier(0.34, 1.06, 0.64, 1),
      background-color 0.3s ease;

    /* 内高光：左上角玻璃反射光晕 */
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
    /* 顶部高光线 — 仅覆盖输入框区域 */
    &::after {
      content: '';
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 12%;
      right: calc(12% + var(--nt-s-height, 45px));
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.28),
        transparent
      );
      z-index: 2;
    }

    .search__engine-icon {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      margin-right: var(--nt-s-padding);
      transition:
        opacity 0.15s ease,
        transform 0.15s ease;
    }
    .search__engine-icon--move {
      cursor: move !important;
    }

    .search__input-wrap {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      align-items: center;
    }
    .search__input {
      all: unset;
      width: 100%;
      height: var(--nt-s-height);
      font-size: var(--nt-s-font-size);
      font-family: inherit;
      color: var(--nt-s-font-color) !important;
      caret-color: var(--nt-s-font-color);
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      background: transparent;
      &::placeholder {
        color: var(--nt-s-font-color);
        opacity: 0.4;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }
    }
    .search__input--move {
      cursor: move !important;
    }
    .input__clear {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--nt-s-font-color);
      opacity: 0.45;
      cursor: pointer;
      font-size: calc(var(--nt-s-font-size) * 0.85);
      transition:
        opacity var(--transition-bg),
        transform var(--transition-bg);
      &:hover {
        opacity: 0.9;
        transform: scale(1.15);
      }
    }
    .input__search {
      all: unset;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      margin-left: var(--nt-s-padding);
      color: var(--nt-s-font-color) !important;
      opacity: 0.65;
      cursor: pointer;
      transition:
        opacity var(--transition-bg),
        transform var(--transition-switch);
      .search__icon {
        font-size: var(--nt-s-font-size);
        display: block;
        filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
        transition: filter 0.18s ease;
      }
      &:hover {
        opacity: 1;
        transform: scale(1.1);
        .search__icon {
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
        }
      }
      &:active {
        transform: scale(0.95);
      }
      &:disabled {
        opacity: 0.4;
        cursor: default;
      }
    }
    .input__search--move {
      cursor: move !important;
    }

    /* 自定义下拉建议列表 — 玻璃质感 */
    .search__dropdown {
      position: absolute;
      top: calc(var(--nt-s-height) + 6px);
      left: 0;
      width: 100%;
      max-height: min(280px, 50vh);
      /* flex 列布局：让 NTScrollArea 撑满并接管滚动 */
      display: flex;
      flex-direction: column;
      /* 圆角比输入框稍小，视觉上收敛 */
      border-radius: calc(var(--nt-s-dropdown-radius));
      backdrop-filter: blur(calc(var(--nt-s-background-blur) * 1.2))
        saturate(1.4);
      background: var(--nt-s-dropdown-bg-color);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.25),
        0 2px 8px rgba(0, 0, 0, 0.1);
      /* 内高光：与输入框保持一致的玻璃语言 */
      &::before {
        content: '';
        pointer-events: none;
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.06) 0%,
          transparent 40%
        );
        z-index: 0;
      }
      /* 顶部连接线 — 与输入框底部的高光线呼应 */
      &::after {
        content: '';
        pointer-events: none;
        position: absolute;
        top: 0;
        left: 15%;
        right: 15%;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.15),
          transparent
        );
        z-index: 2;
      }

      /* NTScrollArea 在 dropdown 内的适配：flex:1 撑满 + min-height:0 允许收缩 */
      .search__dropdown :deep(.reka-scroll-area) {
        height: auto;
        flex: 1;
        min-height: 0;
      }

      .search__dropdown-item {
        position: relative;
        z-index: 1;
        padding: 10px var(--nt-s-padding);
        /* 下拉框独立字体配置 */
        font-family: var(--nt-s-dropdown-font-family);
        color: var(--nt-s-dropdown-font-color);
        font-size: var(--nt-s-dropdown-font-size);
        cursor: pointer;
        transition: background 0.12s ease;
        user-select: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        /* 极淡分隔线 */
        & + .search__dropdown-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: var(--nt-s-padding);
          right: var(--nt-s-padding);
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.06) 50%,
            transparent 100%
          );
        }
        &:hover {
          background: rgba(255, 255, 255, 0.08);
        }
      }
      /* 键盘导航选中态，必须与 .search__dropdown-item 同级 */
      .search__dropdown-item--pending {
        border-radius: var(--radius-md);
        background: color-mix(
          in srgb,
          var(--nt-primary-color) 22%,
          transparent
        );
        /* pending 态左侧醒目高亮条 */
        &::after {
          content: '';
          position: absolute;
          left: 0;
          top: 20%;
          bottom: 20%;
          width: 3px;
          border-radius: 2px;
          background: var(--nt-primary-color);
        }
      }
    }

    /* 深色模式：下拉框整体提亮 */
    :root[data-theme='dark'] &,
    .dark & {
      .search__dropdown {
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.4),
          0 2px 8px rgba(0, 0, 0, 0.15);
        &::before {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.04) 0%,
            transparent 40%
          );
        }
        .search__dropdown-item {
          & + .search__dropdown-item::before {
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.04) 50%,
              transparent 100%
            );
          }
          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        }
        .search__dropdown-item--pending {
          background: color-mix(
            in srgb,
            var(--nt-primary-color) 30%,
            transparent
          );
          &::after {
            background: color-mix(in srgb, var(--nt-primary-color) 80%, white);
          }
        }
      }
    }
  }

  .search__container--border {
    border: var(--nt-s-border-width) solid var(--nt-s-border-color);
    transition: border-color 0.3s cubic-bezier(0.34, 1.06, 0.64, 1);
  }
  .search__container--shadow {
    box-shadow:
      0 4px 24px var(--nt-s-shadow-color),
      0 1px 4px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  .search__container--focus {
    &.search__container--shadow {
      box-shadow:
        0 6px 32px var(--nt-s-shadow-color),
        0 2px 8px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.14);
    }
    &.search__container--border {
      border-color: var(--nt-s-font-color);
    }
    /* 聚焦时背景微微提亮 */
    background-color: color-mix(
      in srgb,
      var(--nt-s-background-color) 85%,
      rgba(255, 255, 255, 0.08) 15%
    );
  }
}

/* 下拉列表展开/收起动画 */
.search-dropdown-enter-active,
.search-dropdown-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.34, 1.06, 0.64, 1);
  transform-origin: top center;
}
.search-dropdown-enter-from,
.search-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scaleY(0.96);
}
.search-dropdown-enter-to,
.search-dropdown-leave-from {
  opacity: 1;
  transform: translateY(0) scaleY(1);
}
</style>
