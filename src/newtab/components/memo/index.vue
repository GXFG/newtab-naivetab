<script setup lang="ts">
import { isDragMode, globalState, localConfig, getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic'

const CNAME = 'memo'
const isRender = getIsComponentRender(CNAME)

const onFocus = () => {
  globalState.isMemoFocused = true
}

const onBlur = () => {
  globalState.isMemoFocused = false
}

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const customWidth = getStyleField(CNAME, 'width', 'px')
const customHeight = getStyleField(CNAME, 'height', 'px')
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderRadius = getStyleField(CNAME, 'borderRadius', 'px')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
</script>

<template>
  <MoveableComponentWrap v-model:dragStyle="dragStyle" componentName="memo">
    <div v-if="isRender" id="memo" data-target-type="1" data-target-name="memo">
      <div
        class="memo__container"
        :style="dragStyle || containerStyle"
        :class="{
          'memo__container--border': localConfig.memo.isBorderEnabled,
          'memo__container--shadow': localConfig.memo.isShadowEnabled,
        }"
      >
        <div class="memo_wrap">
          <NInput
            v-model:value="localConfig.memo.content"
            class="memo__input"
            type="textarea"
            placeholder=" "
            autosize
            :disabled="isDragMode"
            :style="isDragMode ? 'cursor: move;' : ''"
            :show-count="localConfig.memo.countEnabled"
            @focus="onFocus"
            @blur="onBlur"
          />
        </div>
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<style>
#memo {
  font-family: v-bind(customFontFamily);
  .memo__container {
    z-index: 10;
    position: absolute;
    border-radius: v-bind(customBorderRadius);
    background-color: v-bind(customBackgroundColor);
    .n-input__border {
      border: 0 !important;
    }
    .n-input,
    .n-input--focus {
      border-radius: v-bind(customBorderRadius);
    }
    .memo_wrap {
      .n-input--textarea {
        background-color: transparent !important;
      }
      .memo__input {
        padding: 0 8px;
        width: v-bind(customWidth);
        height: v-bind(customHeight);
        font-size: v-bind(customFontSize);
        .n-input__textarea-el {
          caret-color: v-bind(customFontColor);
          color: v-bind(customFontColor);
        }
      }
    }
  }
  .memo__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .memo__container--shadow {
    box-shadow: v-bind(customShadowColor) 0px 2px 4px 0px, v-bind(customShadowColor) 0px 2px 16px 0px;
  }
  /* fix left space */
  .n-input__textarea-el {
    left: 2px !important;
  }
}
</style>
