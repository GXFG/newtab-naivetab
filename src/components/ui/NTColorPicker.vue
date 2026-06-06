<script setup lang="ts">
/**
 * NTColorPicker — NaiveTab 颜色选择器
 *
 * 基于 Reka UI Color 原语组装：ColorArea（SV 面板）+ ColorSlider（色相条）+
 * ColorSwatchPicker（预设色块）。
 *
 * @example
 * <NTColorPicker v-model:value="color" :swatches="['#ff0000', '#00ff00']" />
 */
import {
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaThumb,
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderThumb,
  ColorSwatchPickerRoot,
  ColorSwatchPickerItem,
  ColorSwatchPickerItemSwatch,
} from 'reka-ui'

defineProps<{
  /** 预设色板 */
  swatches?: string[]
}>()

const modelValue = defineModel<string>('value', { required: true })
</script>

<template>
  <div class="reka-color-picker">
    <!-- SV 面板：x=saturation, y=brightness -->
    <ColorAreaRoot
      v-slot="{ style }"
      v-model="modelValue"
      x-channel="saturation"
      y-channel="brightness"
      class="reka-color-picker__area"
    >
      <ColorAreaArea
        :style="style"
        class="reka-color-picker__area-area"
      >
        <ColorAreaThumb class="reka-color-picker__area-thumb" />
      </ColorAreaArea>
    </ColorAreaRoot>

    <!-- 色相条（Track 内部通过 injectContext 自动计算渐变背景，无需传 style） -->
    <ColorSliderRoot
      v-model="modelValue"
      channel="hue"
      class="reka-color-picker__hue-slider"
    >
      <ColorSliderTrack class="reka-color-picker__hue-track">
        <ColorSliderThumb class="reka-color-picker__hue-thumb" />
      </ColorSliderTrack>
    </ColorSliderRoot>

    <!-- 预设色板 -->
    <ColorSwatchPickerRoot
      v-if="swatches?.length"
      v-model="modelValue"
      class="reka-color-picker__swatches"
    >
      <ColorSwatchPickerItem
        v-for="swatch in swatches"
        :key="swatch"
        :value="swatch"
        class="reka-color-picker__swatch-item"
      >
        <ColorSwatchPickerItemSwatch
          :style="{ backgroundColor: swatch }"
          class="reka-color-picker__swatch-color"
        />
      </ColorSwatchPickerItem>
    </ColorSwatchPickerRoot>
  </div>
</template>
