<script setup lang="ts">
/**
 * NTSlider — NaiveTab 滑块组件
 *
 * 基于 Reka UI SliderRoot + SliderTrack + SliderRange + SliderThumb 二次封装。
 * 样式由 src/styles/reka/slider.css 中的 .reka-slider 系列类控制。
 * Reka v-model 为 number[]，本组件桥接为 number（单值模式）。
 *
 * @example
 * <NTSlider v-model:value="val" :min="0" :max="100" :step="1" />
 */
import { computed } from 'vue'
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from 'reka-ui'

defineProps<{
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}>()

const modelValue = defineModel<number>('value', { required: true })

// Reka SliderRoot 的 v-model 是 number[]，桥接为 number
const rekaModel = computed({
  get: () => [modelValue.value],
  set: (v: number[]) => {
    modelValue.value = v[0] ?? 0
  },
})
</script>

<template>
  <SliderRoot
    v-model="rekaModel"
    :min="min ?? 0"
    :max="max ?? 100"
    :step="step ?? 1"
    :disabled="disabled"
    class="reka-slider reka-focus-visible"
  >
    <SliderTrack class="reka-slider__track">
      <SliderRange class="reka-slider__range" />
    </SliderTrack>
    <SliderThumb class="reka-slider__thumb reka-focus-visible" />
  </SliderRoot>
</template>
