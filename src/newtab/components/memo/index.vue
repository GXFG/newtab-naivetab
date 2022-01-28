<template>
  <MoveableComponentWrap componentName="memo" @drag="(style) => (containerStyle = style)">
    <div v-if="isRender" id="memo" data-target-type="1" data-target-name="memo">
      <div class="memo__container" :style="containerStyle" :class="{ 'memo__container--shadow': globalState.style.memo.isShadowEnabled }">
        <div class="memo_wrap">
          <NInput
            v-model:value="globalState.setting.memo.content"
            class="memo__input"
            type="textarea"
            placeholder=" "
            autosize
            :disabled="isDragMode"
            :show-count="globalState.setting.memo.countEnabled"
            @focus="onFocus"
            @blur="onBlur"
          />
        </div>
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<script setup lang="ts">
import { isDragMode, globalState, getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic'

const CNAME = 'memo'
const isRender = getIsComponentRender(CNAME)

const onFocus = () => {
  globalState.state.isMemoFocused = true
}

const onBlur = () => {
  globalState.state.isMemoFocused = false
}

const containerStyle = ref(getLayoutStyle(CNAME))
const customWidth = getStyleField(CNAME, 'width', 'px')
const customHeight = getStyleField(CNAME, 'height', 'px')
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
</script>

<style>
#memo {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  .memo__container {
    z-index: 10;
    position: absolute;
    .memo_wrap {
      .memo__input {
        padding: 5px;
        width: v-bind(customWidth);
        height: v-bind(customHeight);
        font-size: v-bind(customFontSize);
      }
    }
  }
  .memo__container--shadow {
    box-shadow: v-bind(customShadowColor) 0px 2px 4px 0px, v-bind(customShadowColor) 0px 2px 16px 0px;
  }
  /* fix left space */
  .n-input__textarea-el {
    left: 2px !important;
  }
  /* dragMode */
  .n-input.n-input--disabled .n-input__input-el, .n-input.n-input--disabled .n-input__textarea-el {
    cursor: move;
  }
}
</style>
