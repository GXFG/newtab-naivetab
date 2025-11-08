<script setup lang="ts">
import { isDragMode } from '@/logic/moveable'
import { globalState, localConfig, getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic/store'
import MoveableComponentWrap from '@/newtab/components/moveable/MoveableComponentWrap.vue'

const CNAME = 'memo'
const isRender = getIsComponentRender(CNAME)

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
const containerStyle = getLayoutStyle(CNAME)
const customWidth = getStyleField(CNAME, 'width', 'vmin')
const customHeight = getStyleField(CNAME, 'height', 'vmin')
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'vmin')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderRadius = getStyleField(CNAME, 'borderRadius', 'vmin')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
</script>

<template>
  <MoveableComponentWrap
    v-model:dragStyle="dragStyle"
    component-name="memo"
  >
    <div
      v-if="isRender"
      id="memo"
      data-target-type="component"
      data-target-name="memo"
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
