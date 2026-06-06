<script setup lang="ts">
/**
 * NTInput — NaiveTab 输入框组件
 *
 * 对标 Naive UI NInput API，基于原生 <input> / <textarea> 实现。
 * 样式对标 NTSelect trigger + NTAutoComplete input，保持一致视觉。
 *
 * @example
 * <NTInput v-model:value="text" size="small" placeholder="请输入" />
 * <NTInput v-model:value="text" type="textarea" :rows="3" clearable />
 * <NTInput v-model:value="text" show-count :maxlength="100" />
 */
import { Icon } from '@iconify/vue'
import { ref, watch, nextTick, computed } from 'vue'
import { ICONS } from '@/logic/constants/icons'

const props = withDefaults(
  defineProps<{
    /** 输入类型 */
    type?: 'text' | 'textarea'
    /** 尺寸 */
    size?: 'small' | 'medium'
    /** placeholder */
    placeholder?: string
    /** 禁用 */
    disabled?: boolean
    /** 可清除 */
    clearable?: boolean
    /** 显示字数统计 */
    showCount?: boolean
    /** 最大长度 */
    maxlength?: number
    /** textarea 行数（type=textarea 时） */
    rows?: number
    /** 自动调整高度（type=textarea 时） */
    autosize?: boolean
  }>(),
  {
    type: 'text',
    size: 'medium',
    placeholder: undefined,
    disabled: false,
    clearable: false,
    showCount: false,
    maxlength: undefined,
    rows: 3,
    autosize: false,
  },
)

const modelValue = defineModel<string>('value', { default: '' })

const emit = defineEmits<{
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const textareaEl = ref<HTMLTextAreaElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

/** 是否聚焦 */
const isFocused = ref(false)

/** textarea autosize 高度调整 */
function resizeTextarea() {
  if (!props.autosize || !textareaEl.value) return
  const el = textareaEl.value
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

watch(
  () => modelValue.value,
  () => {
    if (props.autosize && props.type === 'textarea') {
      nextTick(resizeTextarea)
    }
  },
)

/** 清空输入 */
function handleClear() {
  modelValue.value = ''
  inputEl.value?.focus()
  textareaEl.value?.focus()
}

/** 当前字符数 */
const currentCount = computed(() => modelValue.value?.length ?? 0)

function onFocus(e: FocusEvent) {
  isFocused.value = true
  emit('focus', e)
}

function onBlur(e: FocusEvent) {
  isFocused.value = false
  emit('blur', e)
}
</script>

<template>
  <div
    class="reka-input"
    :class="{
      'reka-input--small': size === 'small',
      'reka-input--textarea': type === 'textarea',
      'reka-input--focused': isFocused,
      'reka-input--disabled': disabled,
      'reka-input--clearable': clearable,
      'reka-input--show-count': showCount,
    }"
  >
    <!-- 单行文本 -->
    <input
      v-if="type === 'text'"
      ref="inputEl"
      v-model="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      class="reka-input__native reka-focus-visible"
      @focus="onFocus"
      @blur="onBlur"
    />

    <!-- 多行文本 -->
    <textarea
      v-else
      ref="textareaEl"
      v-model="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :rows="rows"
      class="reka-input__native reka-focus-visible"
      @focus="onFocus"
      @blur="onBlur"
    />

    <!-- 清除按钮 -->
    <button
      v-if="clearable && currentCount > 0 && !disabled"
      type="button"
      class="reka-input__clear"
      :aria-label="$t('common.clear')"
      @click.stop="handleClear"
    >
      <Icon
        :icon="ICONS.close"
        class="reka-input__clear-icon"
      />
    </button>

    <!-- 字数统计（绝对定位在输入框内部右侧） -->
    <span
      v-if="showCount"
      class="reka-input__count"
    >
      {{ currentCount }}<template v-if="maxlength"> / {{ maxlength }}</template>
    </span>
  </div>
</template>
