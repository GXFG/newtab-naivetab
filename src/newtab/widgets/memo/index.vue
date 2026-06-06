<script setup lang="ts">
import { isDragMode } from '@/logic/moveable'
import { localConfig } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'
import { getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customCountFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 0.7)
const customPadding = getStyleField(WIDGET_CODE, 'padding', 'vmin')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')

const memoStyle = computed(() => ({
  '--nt-memo-font-family': customFontFamily.value,
  '--nt-memo-font-color': customFontColor.value,
  '--nt-memo-font-size': customFontSize.value,
  '--nt-memo-count-font-size': customCountFontSize.value,
  '--nt-memo-border-radius': customBorderRadius.value,
  '--nt-memo-padding': customPadding.value,
  '--nt-memo-background-color': customBackgroundColor.value,
  '--nt-memo-background-blur': customBackgroundBlur.value,
  '--nt-memo-border-width': customBorderWidth.value,
  '--nt-memo-border-color': customBorderColor.value,
  '--nt-memo-shadow-color': customShadowColor.value,
  '--nt-memo-width': customWidth.value,
  '--nt-memo-height': customHeight.value,
}))

const onFocus = () => {
  globalState.isInputFocused = true
}

const onBlur = () => {
  globalState.isInputFocused = false
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
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="memo__container"
      :style="memoStyle"
      :class="{
        'memo__container--border': localConfig.memo.isBorderEnabled,
        'memo__container--shadow': localConfig.memo.isShadowEnabled,
      }"
    >
      <div class="memo_wrap">
        <textarea
          v-model="localConfig.memo.content"
          class="memo__input"
          :class="{ 'memo__input--move': isDragMode }"
          placeholder=" "
          @focus="onFocus"
          @blur="onBlur"
          @input="handleMemoInput"
        />
        <span
          v-if="localConfig.memo.countEnabled"
          class="memo__count"
        >
          {{ localConfig.memo.content?.length ?? 0 }}
        </span>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#memo {
  font-family: var(--nt-memo-font-family);

  .memo__container {
    z-index: 10;
    position: absolute;
    border-radius: var(--nt-memo-border-radius);
    background-color: var(--nt-memo-background-color);
    backdrop-filter: blur(var(--nt-memo-background-blur)) saturate(1.4);
    transition:
      box-shadow 0.25s ease,
      border-color 0.25s ease,
      background-color 0.25s ease;
    will-change: transform;

    /* 内高光：左上角玻璃反射光晕 */
    &::before {
      content: '';
      pointer-events: none;
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(
        ellipse at 10% 10%,
        rgba(255, 255, 255, 0.12) 0%,
        rgba(255, 255, 255, 0.04) 35%,
        transparent 65%
      );
      z-index: 0;
    }
    /* 顶部高光线 */
    &::after {
      content: '';
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 12%;
      right: 12%;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.28),
        transparent
      );
      border-radius: 50%;
      z-index: 1;
    }

    .memo_wrap {
      position: relative;
      z-index: 1;
      width: var(--nt-memo-width);
      height: var(--nt-memo-height);
      padding: var(--nt-memo-padding);
      font-size: var(--nt-memo-font-size);
      font-family: inherit;
      caret-color: var(--nt-memo-font-color);
      color: var(--nt-memo-font-color);

      .memo__input {
        all: unset;
        display: block;
        box-sizing: border-box;
        width: 100%;
        height: 100%;

        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        letter-spacing: 0.2px;
        line-height: 1;
        border: 0;
        border-radius: var(--nt-memo-border-radius);
        background: transparent;
        outline: none;
        resize: none;
        overflow: hidden;
        white-space: pre-wrap;
        overflow-wrap: break-word;
      }
      .memo__input::placeholder {
        opacity: 0;
      }
      .memo__input--move {
        cursor: move !important;
      }
      .memo__count {
        position: absolute;
        right: 0;
        bottom: 0;
        padding: var(--nt-memo-padding);
        font-size: var(--nt-memo-count-font-size);
        opacity: 0.45;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        letter-spacing: 0.2px;
        transition: opacity 0.18s ease;
      }
    }
  }

  /* 聚焦时字数统计更明显 */
  .memo__container:focus-within {
    .memo__count {
      opacity: 0.65;
    }
  }

  .memo__container--border {
    border: var(--nt-memo-border-width) solid var(--nt-memo-border-color);
  }
  .memo__container--shadow {
    box-shadow:
      0 4px 24px var(--nt-memo-shadow-color),
      0 1px 4px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  /* 聚焦时阴影加深 */
  .memo__container--shadow:focus-within {
    box-shadow:
      0 6px 32px var(--nt-memo-shadow-color),
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }
}
</style>
