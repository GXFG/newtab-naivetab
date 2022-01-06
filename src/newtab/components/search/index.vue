<template>
  <MoveableElement componentName="search" @onDrag="(style) => (containerStyle = style)">
    <div v-if="globalState.setting.search.enabled || globalState.state.dragTempEnabled.search" id="search" data-target-type="1" data-target-name="search">
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
          :class="{ 'input__main--move': isDragMode }"
          :placeholder="placeholder"
          :disabled="isDragMode"
          @focus="onSearchFocus()"
          @blur="onSearchBlur"
          @keyup.enter="onSearch()"
        />
        <il:search class="input__icon" :class="{ 'input__icon--move': isDragMode }" @click="onSearch()" />
      </div>
    </div>
  </MoveableElement>
</template>

<script setup lang="ts">
import { globalState, isDragMode, getLayoutStyle, getStyleField, openNewPage } from '@/logic'

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
    .input__icon {
      margin: 3px 0 0 10px;
      cursor: pointer;
    }
    .input__icon--move {
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
