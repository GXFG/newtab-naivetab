<script setup lang="ts">
/**
 * NTColorPicker — NaiveTab 颜色选择器
 *
 * 基于 Reka UI Color 原语组装：ColorArea（SV 面板）+ ColorSlider（色相 +
 * 透明度）+ ColorSwatchPicker（预设色块）+ 自定义输入框。
 *
 * 未使用 ColorRoot 包裹：各 primitive（ColorAreaRoot、ColorSliderRoot、
 * ColorSwatchPickerRoot）通过共享 v-model="draftColor" 独立管理颜色状态，
 * Reka UI 内部自动完成颜色值互转同步，ColorRoot context 非必需。
 *
 * 内部使用 hex 格式（alpha<1 时自动 8 位 #rrggbbaa），外部通过 format prop
 * 控制 v-model 输出格式。
 *
 * @example
 * <NTColorPicker v-model:value="color" :swatches="['#ff0000', '#00ff00']" />
 * <NTColorPicker v-model:value="color" format="hex" />
 */
import { ref, computed, watch } from 'vue'
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
  parseColor,
  colorToString,
  isValidColor,
} from 'reka-ui'

const props = withDefaults(
  defineProps<{
    /** 预设色板 */
    swatches?: string[]
    /** 是否禁用 */
    disabled?: boolean
    /** 是否只读 */
    readonly?: boolean
    /** 输入框占位文本 */
    placeholder?: string
    /**
     * v-model 输出格式
     * - 'rgb': 输出 rgb() 或 rgba()（alpha<1 时自动切换）
     * - 'hex': 输出 #rrggbb 或 #rrggbbaa（alpha<1 时自动补 alpha）
     */
    format?: 'hex' | 'rgb'
  }>(),
  {
    swatches: () => [],
    disabled: false,
    readonly: false,
    placeholder: '',
    format: 'rgb',
  },
)

const modelValue = defineModel<string>('value', { required: true })

/** 将外部值转为内部 hex 格式 */
function toHex(val: string): string {
  if (isValidColor(val)) {
    return colorToString(parseColor(val), 'hex')
  }
  return val
}

/** 归一化 swatches 为 hex，与 draftColor 格式一致，确保 ColorSwatchPicker 正确匹配选中态 */
const normalizedSwatches = computed(
  () => props.swatches?.map((s) => toHex(s)) ?? [],
)

/** 将内部 hex 值按 format 格式化输出，alpha 四舍五入到 2 位小数 */
function formatOutput(val: string): string {
  if (isValidColor(val)) {
    const str = colorToString(parseColor(val), props.format)
    // rgba(255, 0, 0, 0.5300000000000001) → rgba(255, 0, 0, 0.53)
    return str.replace(
      /(rgba?\(.+?,)\s*([\d.]+)\)/,
      (_, head, alpha) =>
        `${head} ${Math.round(parseFloat(alpha) * 100) / 100})`,
    )
  }
  return val
}

// ============================================================
// 内部颜色状态（始终 hex，alpha<1 时自动 8 位）
// ============================================================
const draftColor = ref(toHex(modelValue.value))

/** 父级 → 内部 */
watch(
  () => modelValue.value,
  (val) => {
    const hex = toHex(val)
    if (hex !== draftColor.value) {
      draftColor.value = hex
    }
  },
)

/** 内部 → 父级（格式转换） */
watch(draftColor, (val) => {
  const formatted = formatOutput(val)
  if (formatted !== modelValue.value) {
    modelValue.value = formatted
  }
})

// ============================================================
// 自定义输入框（替换 ColorFieldInput，支持 rgb/rgba 显示）
// ============================================================
const inputText = ref(formatOutput(draftColor.value))
const isEditing = ref(false)

/** 拖拽/色板点击时自动同步输入框（编辑中跳过，保留用户输入） */
watch(draftColor, (val) => {
  if (!isEditing.value) {
    inputText.value = formatOutput(val)
  }
})

function onInput(e: Event) {
  inputText.value = (e.target as HTMLInputElement).value
}

function commit() {
  isEditing.value = false
  const trimmed = inputText.value.trim()
  if (isValidColor(trimmed)) {
    draftColor.value = toHex(trimmed)
  } else {
    // 非法输入回退到当前颜色
    inputText.value = formatOutput(draftColor.value)
  }
}

function onFocus() {
  isEditing.value = true
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commit()
    ;(e.target as HTMLInputElement).blur()
  }
  if (e.key === 'Escape') {
    isEditing.value = false
    inputText.value = formatOutput(draftColor.value)
    ;(e.target as HTMLInputElement).blur()
  }
}
</script>

<template>
  <div class="reka-color-picker">
    <!-- SV 面板：x=saturation, y=brightness -->
    <ColorAreaRoot
      v-slot="{ style }"
      v-model="draftColor"
      x-channel="saturation"
      y-channel="brightness"
      :disabled="disabled"
      :readonly="readonly"
      class="reka-color-picker__area"
    >
      <ColorAreaArea
        :style="style"
        class="reka-color-picker__area-area"
      >
        <ColorAreaThumb class="reka-color-picker__area-thumb" />
      </ColorAreaArea>
    </ColorAreaRoot>

    <!-- 色相条 -->
    <ColorSliderRoot
      v-model="draftColor"
      channel="hue"
      :disabled="disabled"
      :readonly="readonly"
      class="reka-color-picker__hue-slider"
    >
      <ColorSliderTrack class="reka-color-picker__hue-track">
        <ColorSliderThumb class="reka-color-picker__hue-thumb" />
      </ColorSliderTrack>
    </ColorSliderRoot>

    <!-- 透明度条（checkerboard 背景由 CSS 提供，step=1 即 0.01 精度） -->
    <ColorSliderRoot
      v-model="draftColor"
      channel="alpha"
      :step="1"
      :disabled="disabled"
      :readonly="readonly"
      class="reka-color-picker__alpha-slider"
    >
      <ColorSliderTrack class="reka-color-picker__alpha-track">
        <ColorSliderThumb class="reka-color-picker__alpha-thumb" />
      </ColorSliderTrack>
    </ColorSliderRoot>

    <!-- 自定义输入框 -->
    <input
      :value="inputText"
      :disabled="disabled"
      :readonly="readonly"
      :placeholder="placeholder"
      class="reka-color-picker__input"
      @input="onInput"
      @focus="onFocus"
      @blur="commit"
      @keydown="onKeydown"
    />

    <!-- 预设色板（swatches 归一化为 hex 再传入，确保与 draftColor 格式一致） -->
    <ColorSwatchPickerRoot
      v-if="normalizedSwatches.length"
      v-model="draftColor"
      :disabled="disabled"
      :readonly="readonly"
      selection-behavior="replace"
      class="reka-color-picker__swatches"
    >
      <ColorSwatchPickerItem
        v-for="swatch in normalizedSwatches"
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
