<script setup lang="ts">
import { isDragMode } from '@/logic/moveable'
import { globalState, localConfig, getIsWidgetRender, getLayoutStyle, getStyleField } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

const onFocus = () => {
  globalState.isMemoFocused = true
}

const onBlur = () => {
  globalState.isMemoFocused = false
}

// isDragMode下不允许输入
let lastMemoContent = ''

const handleMemoInput = () => {
  if (lastMemoContent.length !== 0) {
    localConfig.memo.content = lastMemoContent
  }
}

watch(
  () => isDragMode.value,
  (data) => {
    if (data) {
      lastMemoContent = localConfig.memo.content
    } else {
      lastMemoContent = ''
    }
  },
)

const dragStyle = ref('')
const containerStyle = getLayoutStyle(WIDGET_CODE)
const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')
const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')
</script>

<template>
  <WidgetWrap
    v-model:dragStyle="dragStyle"
    widget-code="memo"
  >
    <div
      v-if="isRender"
      id="memo"
      data-target-type="widget"
      data-target-code="memo"
    >
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
            :class="{ 'memo__input--move': isDragMode }"
            type="textarea"
            placeholder=" "
            autosize
            :style="isDragMode ? 'cursor: move;' : ''"
            :show-count="localConfig.memo.countEnabled"
            @focus="onFocus"
            @blur="onBlur"
            @input="handleMemoInput"
          />
        </div>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#memo {
  font-family: v-bind(customFontFamily);
  .memo__container {
    z-index: 10;
    position: absolute;
    border-radius: v-bind(customBorderRadius);
    background-color: v-bind(customBackgroundColor);
    backdrop-filter: blur(v-bind(customBackgroundBlur));
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
        .n-input__border,
        .n-input__state-border {
          border: 0 !important;
          box-shadow: none !important;
        }
        .n-input-word-count {
          color: v-bind(customFontColor) !important;
          opacity: 0.7;
        }
      }
      .memo__input--move {
        cursor: move !important;
        .n-input__textarea-el {
          cursor: move !important;
        }
      }
    }
  }
  .memo__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .memo__container--shadow {
    box-shadow:
      v-bind(customShadowColor) 0px 2px 4px 0px,
      v-bind(customShadowColor) 0px 2px 16px 0px;
  }
  /* fix left space */
  .n-input__textarea-el {
    left: 2px !important;
  }
}
</style>
