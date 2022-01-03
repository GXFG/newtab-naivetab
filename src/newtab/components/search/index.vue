<template>
  <Moveable componentName="search" @onDrag="(style) => (containerStyle = style)">
    <div v-if="globalState.setting.search.enabled" id="search" data-cname="search">
      <div
        class="search__container"
        :style="containerStyle"
        :class="{
          'search__container--focus': globalState.style.search.isBorderEnabled && state.isFocused,
          'search__container--border': globalState.style.search.isBorderEnabled,
          'search__container--shadow': globalState.style.search.isShadowEnabled,
        }"
      >
        <input
          v-model="state.searchValue"
          class="input__main"
          :placeholder="placeholder"
          :disabled="isDragMode"
          @focus="onSearchFocus()"
          @blur="onSearchBlur"
          @keyup.enter="onSearch()"
        />
        <il:search class="input__icon" @click="onSearch()" />
      </div>
    </div>
  </Moveable>
</template>

<script setup lang="ts">
import { globalState, isDragMode, getLayoutStyle, formatNumWithPixl, openNewPage } from '@/logic'
import { getStyleConst } from '@/styles/index'

const CNAME = 'search'

const state = reactive({
  isFocused: false,
  searchValue: '',
})

const placeholder = computed(() => `${globalState.setting.search.urlName}`)

const onSearchFocus = () => {
  state.isFocused = true
}
const onSearchBlur = () => {
  state.isFocused = false
}

const onSearch = () => {
  if (state.searchValue.length === 0) {
    return
  }
  const url = globalState.setting.search.urlValue.replace('{query}', state.searchValue)
  openNewPage(url)
  state.searchValue = ''
}

const containerStyle = ref(getLayoutStyle(CNAME))
const customWidth = computed(() => formatNumWithPixl(CNAME, 'width'))
const customFontSize = computed(() => formatNumWithPixl(CNAME, 'fontSize'))
const customBorderWidth = computed(() => formatNumWithPixl(CNAME, 'borderWidth'))
const borderColorMain = computed(() => getStyleConst('borderColorMain', globalState.localState.currThemeCode))
</script>

<style scoped>
#search {
  font-family: v-bind(globalState.style.search.fontFamily);
  color: v-bind(globalState.style.search.fontColor[globalState.localState.currThemeCode]);
  font-size: v-bind(customFontSize);
  user-select: none;
  .search__container {
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
    .input__icon {
      margin: 3px 0 0 10px;
      cursor: pointer;
    }
  }
  .search__container--focus {
    border-bottom: v-bind(customBorderWidth) solid v-bind(globalState.style.search.activeColor[globalState.localState.currThemeCode]) !important;
  }
  .search__container--border {
    border-bottom: v-bind(customBorderWidth) solid v-bind(globalState.style.search.borderColor[globalState.localState.currThemeCode]);
  }
  .search__container--shadow {
    text-shadow: 2px 8px 6px v-bind(globalState.style.search.shadowColor[globalState.localState.currThemeCode]);
  }
}
</style>
