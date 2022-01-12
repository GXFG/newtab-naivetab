<template>
  <MoveableComponentWrap componentName="search" @drag="(style) => (containerStyle = style)">
    <div v-if="isRender" id="search" data-target-type="1" data-target-name="search">
      <NDropdown :show="state.isSuggestVisible" :options="state.suggestList" :placement="state.placementValue" :show-arrow="true" @select="handleSelectSuggest" @clickoutside="handleSelectOutside">
        <div
          class="search__container"
          :style="containerStyle"
          :class="{
            'search__container--focus': globalState.style.search.isBorderEnabled && globalState.state.isSearchFocused,
            'search__container--border': globalState.style.search.isBorderEnabled,
            'search__container--shadow': globalState.style.search.isShadowEnabled,
          }"
        >
          <input
            v-model="state.searchValue"
            class="input__main"
            :class="{ 'input__main--move': isDragMode }"
            :placeholder="placeholder"
            :disabled="isDragMode"
            @focus="onSearchFocus()"
            @blur="onSearchBlur"
            @input="onSearchInput"
            @keyup.enter="handleSearch()"
          >
          <div class="input__clear" :class="{ 'input__clear--move': isDragMode }">
            <icon-park-outline:close-one v-show="isClearVisible" @click="onClearValue()" />
          </div>
          <il:search class="input__search" :class="{ 'input__search--move': isDragMode }" @click="handleSearch()" />
        </div>
      </NDropdown>
    </div>
  </MoveableComponentWrap>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { globalState, isDragMode, getIsComponentRender, getLayoutStyle, getStyleField, openNewPage } from '@/logic'
import http from '@/lib/http'

const CNAME = 'search'
const isRender = getIsComponentRender(CNAME)

const state = reactive({
  searchValue: '',
  isSuggestVisible: false,
  placementValue: 'bottom' as any,
  suggestList: [],
})

const placeholder = computed(() => `${globalState.setting.search.urlName}`)
const isClearVisible = computed(() => state.searchValue.length !== 0)

const onSearchFocus = () => {
  globalState.state.isSearchFocused = true
  state.isSuggestVisible = true
}

const onSearchBlur = () => {
  globalState.state.isSearchFocused = false
}

const onSearchInput = () => {
  if (state.searchValue.length === 0 || state.isSuggestVisible) {
    return
  }
  state.isSuggestVisible = true
}

const onClearValue = () => {
  state.searchValue = ''
  state.suggestList = []
}

const onSearch = () => {
  if (state.searchValue.length === 0) {
    return
  }
  const url = globalState.setting.search.urlValue.replace('{query}', state.searchValue)
  state.isSuggestVisible = false
  openNewPage(url)
  state.searchValue = ''
}

const handleSearch = useDebounceFn(onSearch, 200)

const getBaiduSuggest = async() => {
  if (state.searchValue.length === 0) {
    return
  }
  const data: any = await http({
    url: 'https://www.baidu.com/sugrec',
    params: {
      prod: 'pc',
      wd: state.searchValue,
    },
  })
  if (data && data.g && data.g.length !== 0) {
    state.suggestList = data.g.map((item: { q: string[] }) => ({
      label: item.q,
      key: item.q,
    }))
  } else {
    state.suggestList = []
  }
}

const getBaiduSuggestHandler = useDebounceFn(getBaiduSuggest, 300)

watch(
  () => state.searchValue,
  () => {
    if (state.searchValue.length === 0) {
      onClearValue()
      return
    }
    getBaiduSuggestHandler()
  },
)

watch(isDragMode, () => {
  onClearValue()
})

const handleSelectSuggest = (key: string) => {
  state.searchValue = key
  state.isSuggestVisible = false
  handleSearch()
}

const handleSelectOutside = () => {
  state.isSuggestVisible = false
}

const containerStyle = ref(getLayoutStyle(CNAME))
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
const customWidth = getStyleField(CNAME, 'width', 'px')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customActiveColor = getStyleField(CNAME, 'activeColor')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
</script>

<style scoped>
#search {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  font-size: v-bind(customFontSize);
  user-select: none;
  .search__container {
    z-index: 10;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 5px 10px;
    .input__main {
      flex: 1;
      width: v-bind(customWidth);
      background-color: transparent;
    }
    .input__main--move {
      cursor: move !important;
    }
    .input__clear {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 50px;
      font-size: 16px;
      cursor: pointer;
    }
    .input__clear--move {
      cursor: move !important;
    }
    .input__search {
      margin: 3px 0 0 0;
      cursor: pointer;
    }
    .input__search--move {
      cursor: move !important;
    }
  }
  .search__container--focus {
    border-bottom: v-bind(customBorderWidth) solid v-bind(customActiveColor) !important;
  }
  .search__container--border {
    border-bottom: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .search__container--shadow {
    text-shadow: 2px 8px 6px v-bind(customShadowColor);
  }
}
</style>
