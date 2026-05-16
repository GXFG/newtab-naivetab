<script setup lang="ts">
/**
 * GlobalShortcutRecorder
 *
 * 通用修饰键录制器组件，通过 v-model 双向绑定修饰键数组。
 * 不依赖任何业务配置，可在任意场景复用。
 *
 * 使用示例：
 * ```vue
 * <GlobalShortcutRecorder v-model="config.modifier" />
 * ```
 */

import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import {
  formatModifierKeys,
  type TShortcutModifier,
} from '@/logic/shortcut/utils'
import { NButton } from 'naive-ui'
import { showToast } from '@/common/toast'
import { onUnmounted } from 'vue'

const isRecording = ref(false)
const pressedModifiers = reactive(new Set<TShortcutModifier>())
let debounceTimer: ReturnType<typeof setTimeout> | null = null
// 修饰键快照：记录 keydown 时捕获的修饰键状态，防止 keyup 清空集合后丢失用户选择
let lastModifierSnapshot: TShortcutModifier[] = []

const modifier = defineModel<TShortcutModifier[]>({ default: [] })

const props = defineProps<{
  disabled?: boolean
}>()

const formattedModifier = computed(() => {
  return formatModifierKeys(modifier.value)
})

/**
 * 从 pressedModifiers 集合生成修饰键数组
 *
 * 顺序固定为 ctrl → shift → alt → meta，与 buildModifierKeys 保持一致。
 * GlobalShortcutRecorder 录制出的值将写入 localConfig，必须与 matchShortcut 的
 * 集合比较兼容。
 */
const modifierFromSet = (): TShortcutModifier[] => {
  const parts: TShortcutModifier[] = []
  if (pressedModifiers.has('ctrl')) parts.push('ctrl')
  if (pressedModifiers.has('shift')) parts.push('shift')
  if (pressedModifiers.has('alt')) parts.push('alt')
  if (pressedModifiers.has('meta')) parts.push('meta')
  return parts
}

/**
 * 清除录制过程中的所有状态
 */
const clearRecordingState = () => {
  pressedModifiers.clear()
  lastModifierSnapshot = []
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

const cancelRecording = () => {
  clearRecordingState()
  isRecording.value = false
}

const saveModifier = () => {
  const modifiers =
    lastModifierSnapshot.length > 0 ? lastModifierSnapshot : modifierFromSet()
  if (modifiers.length === 0) {
    showToast.warning(window.$t('keyboardBookmark.requireModifier'))
    return
  }
  modifier.value = modifiers
  isRecording.value = false
  showToast.success(`${window.$t('common.success')}`)
}

/**
 * 按键按下处理
 *
 * ⚠️ 使用 capture phase (true)：
 * 确保在页面脚本的 keydown 监听器之前捕获事件，
 * 防止页面调用 stopPropagation 导致录制器收不到事件。
 */
const handleKeydown = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    e.preventDefault()
    cancelRecording()
    return
  }

  const hasModifier = e.ctrlKey || e.shiftKey || e.altKey || e.metaKey
  if (!hasModifier) return
  e.preventDefault()

  if (e.ctrlKey) pressedModifiers.add('ctrl')
  if (e.shiftKey) pressedModifiers.add('shift')
  if (e.altKey) pressedModifiers.add('alt')
  if (e.metaKey) pressedModifiers.add('meta')

  lastModifierSnapshot = modifierFromSet()

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => saveModifier(), 100)
}

const handleKeyup = (e: KeyboardEvent) => {
  const hasModifier = e.ctrlKey || e.shiftKey || e.altKey || e.metaKey
  if (hasModifier) {
    e.preventDefault()
  }

  if (e.code === 'ControlLeft' || e.code === 'ControlRight')
    pressedModifiers.delete('ctrl')
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight')
    pressedModifiers.delete('shift')
  if (e.code === 'AltLeft' || e.code === 'AltRight')
    pressedModifiers.delete('alt')
  if (e.code === 'MetaLeft' || e.code === 'MetaRight')
    pressedModifiers.delete('meta')

  if (pressedModifiers.size === 0 && debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
    saveModifier()
  }
}

const toggleRecording = () => {
  if (props.disabled) return
  if (isRecording.value) {
    cancelRecording()
    return
  }
  pressedModifiers.clear()
  lastModifierSnapshot = []
  isRecording.value = true
}

watch(isRecording, (value) => {
  if (value) {
    window.addEventListener('keydown', handleKeydown, true)
    window.addEventListener('keyup', handleKeyup, true)
  } else {
    window.removeEventListener('keydown', handleKeydown, true)
    window.removeEventListener('keyup', handleKeyup, true)
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }
})

onUnmounted(() => {
  if (isRecording.value) {
    cancelRecording()
  }
})
</script>

<template>
  <div
    class="recorder__row"
    :class="{ 'recorder__row--disabled': disabled }"
  >
    <div
      v-if="isRecording"
      class="recorder__capture recorder__capture--recording"
      @click.stop
    >
      {{ $t('keyboardBookmark.recording') }}
    </div>
    <div
      v-else
      class="recorder__capture"
    >
      <span>{{
        formattedModifier || $t('keyboardBookmark.recordModifier')
      }}</span>
    </div>

    <NButton
      quaternary
      size="tiny"
      :class="[
        'recorder__toggle-btn',
        { 'recorder__toggle-btn--active': isRecording },
      ]"
      @click="toggleRecording"
    >
      <Icon
        v-if="!isRecording"
        :icon="ICONS.record"
        class="toggle__icon"
      />
      <Icon
        v-else
        :icon="ICONS.stop"
        class="toggle__icon toggle__icon--stop"
      />
    </NButton>
  </div>
</template>

<style scoped>
.recorder__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recorder__row--disabled {
  opacity: 0.5;
  pointer-events: none;
  user-select: none;
}

.recorder__capture {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  border-radius: 6px;
  transition: all var(--transition-fast);
  user-select: none;
  white-space: nowrap;
}

.recorder__capture--recording {
  background-color: color-mix(in srgb, var(--color-error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-error) 35%, transparent);
  color: var(--color-error);
  animation: pulse 1.4s ease-in-out infinite;
}

.recorder__toggle-btn {
  flex-shrink: 0;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  min-width: 32px;
  padding: 0;
  transition: all var(--transition-fast);
  border: 1px solid var(--n-border-color);
}

.recorder__toggle-btn:hover {
  background-color: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.recorder__toggle-btn--active {
  border-color: color-mix(in srgb, var(--color-error) 40%, transparent);
  background-color: color-mix(in srgb, var(--color-error) 8%, transparent);
}

.recorder__toggle-btn--active:hover {
  background-color: color-mix(in srgb, var(--color-error) 15%, transparent);
}

.toggle__icon {
  font-size: 18px;
  color: var(--color-error);
  transition: all var(--transition-fast);
}

.toggle__icon--stop {
  font-size: 16px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
