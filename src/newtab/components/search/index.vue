<template>
  <MoveableComponentWrap componentName="search" @drag="(style) => (dragStyle = style)">
    <div v-if="isRender" id="search" data-target-type="1" data-target-name="search">
      <NDropdown
        :show="localState.setting.search.suggestionEnabled && state.isSuggestVisible"
        :options="state.suggestList"
        :placement="state.placementValue"
        :show-arrow="true"
        @select="handleSelectSuggest"
        @clickoutside="handleSelectOutside"
      >
        <div
          class="search__container"
          :style="dragStyle || containerStyle"
          :class="{
            'search__container--focus': localState.style.search.isBorderEnabled && globalState.isSearchFocused,
            'search__container--border': localState.style.search.isBorderEnabled,
            'search__container--shadow': localState.style.search.isShadowEnabled,
          }"
        >
          <NInputGroup>
            <NInput
              v-model:value="state.searchValue"
              type="text"
              size="large"
              class="input__main"
              :class="{ 'input__main--move': isDragMode }"
              :placeholder="localState.setting.search.placeholder"
              :disabled="isDragMode"
              clearable
              @focus="onSearchFocus()"
              @blur="onSearchBlur"
              @input="onSearchInput"
              @keyup.enter="handleSearch()"
            />
            <NButton
              v-if="localState.setting.search.iconEnabled"
              size="large"
              text
              class="input__search"
              :class="{ 'input__search--move': isDragMode }"
              @click="handleSearch()"
            >
              <il:search />
            </NButton>
          </NInputGroup>
        </div>
      </NDropdown>
    </div>
  </MoveableComponentWrap>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { localState, globalState, isDragMode, getIsComponentRender, getLayoutStyle, getStyleField, createTab } from '@/logic'
import { getBaiduSugrec } from '@/api'

const CNAME = 'search'
const isRender = getIsComponentRender(CNAME)

const state = reactive({
  searchValue: '',
  isSuggestVisible: false,
  placementValue: 'bottom' as any,
  suggestList: [],
})

const onSearchFocus = () => {
  globalState.value.isSearchFocused = true
  state.isSuggestVisible = true
}

const onSearchBlur = () => {
  globalState.value.isSearchFocused = false
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
  const url = localState.setting.search.urlValue.replace('{query}', state.searchValue)
  state.isSuggestVisible = false
  createTab(url)
  state.searchValue = ''
}

const handleSearch = useDebounceFn(onSearch, 200)

const getBaiduSuggest = async() => {
  if (state.searchValue.length === 0) {
    return
  }
  const data: any = await getBaiduSugrec(state.searchValue)
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
    if (!localState.setting.search.suggestionEnabled) {
      return
    }
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

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
const customWidth = getStyleField(CNAME, 'width', 'px')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
</script>

<style scoped>
#search {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  user-select: none;
  .search__container {
    z-index: 10;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 3px;
    background-color: v-bind(customBackgroundColor);
    .input__main {
      flex: 1;
      width: v-bind(customWidth);
      font-size: v-bind(customFontSize);
      background-color: v-bind(customBackgroundColor);
    }
    .input__main--move {
      cursor: move !important;
    }
    .input__search {
      width: 50px;
      cursor: pointer;
    }
    .input__search--move {
      cursor: move !important;
    }
  }
  .search__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .search__container--shadow {
    box-shadow: v-bind(customShadowColor) 0px 2px 4px 0px, v-bind(customShadowColor) 0px 2px 16px 0px;
  }
}
</style>
