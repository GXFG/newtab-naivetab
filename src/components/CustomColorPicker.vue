<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { parseColor, colorToString, isValidColor } from 'reka-ui'
import { ICONS } from '@/logic/constants/icons'
import { FAVORITE_SWATCHE_MAX_COUNT } from '@/logic/constants/app'
import { localConfig } from '@/logic/config/state'
import NTPopover from '@/components/ui/NTPopover.vue'
import NTColorPicker from '@/components/ui/NTColorPicker.vue'
import { showToast } from '@/common/toast'

const props = defineProps({
  value: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const customEntryBackgroundColor = computed(() => props.value)

const cssVars = computed(() => ({
  '--nt-color-picker-entry-bg': customEntryBackgroundColor.value,
}))

const emit = defineEmits(['update:value'])

/** 拖拽中的即时色值（驱动面板实时反馈，不触发父级更新） */
const draftColor = ref(props.value)

/** 外部值变化时同步 draft（如点击色板预设） */
watch(
  () => props.value,
  (val) => {
    draftColor.value = val
  },
)

/** 防抖 emit，拖拽结束后才通知父级 */
const debouncedEmit = useDebounceFn((value: string) => {
  emit('update:value', value)
}, 100)

/** 拖拽时即时更新 draft 实现实时反馈，防抖后 emit */
const handleColorUpdate = (value: string) => {
  draftColor.value = value
  debouncedEmit(value)
}

/** 归一化颜色为 hex，用于跨格式比较（hex vs rgb vs rgba） */
function normalizeHex(val: string): string {
  if (isValidColor(val)) return colorToString(parseColor(val), 'hex')
  return val
}

const isFavorite = computed(() =>
  localConfig.general.swatcheColors.some(
    (c) => normalizeHex(c) === normalizeHex(draftColor.value),
  ),
)

const addFavoriteColor = () => {
  if (isFavorite.value) {
    return
  }
  if (localConfig.general.swatcheColors.length >= FAVORITE_SWATCHE_MAX_COUNT) {
    showToast.error(window.$t('prompts.favoriteLimit'))
    return
  }
  // 统一以 hex 存储，保证 swatcheColors 格式一致性
  localConfig.general.swatcheColors.push(normalizeHex(draftColor.value))
}

const removeFavoriteColor = () => {
  if (!isFavorite.value) {
    return
  }
  const targetHex = normalizeHex(draftColor.value)
  const targetIndex = localConfig.general.swatcheColors.findIndex(
    (c) => normalizeHex(c) === targetHex,
  )
  if (targetIndex !== -1) {
    localConfig.general.swatcheColors.splice(targetIndex, 1)
  }
}
</script>

<template>
  <NTPopover
    trigger="click"
    placement="top"
    class="custom-color-picker"
    :disabled="disabled"
  >
    <template #trigger>
      <div
        class="color-picker__entry"
        :class="[props.class, { 'color-picker__entry--disabled': disabled }]"
        :style="cssVars"
      />
    </template>

    <div class="color-picker__container">
      <NTColorPicker
        :value="draftColor"
        :swatches="localConfig.general.swatcheColors"
        @update:value="handleColorUpdate"
      />

      <div class="picker__favorite">
        <NTButton
          type="primary"
          variant="text"
          size="small"
          @click="isFavorite ? removeFavoriteColor() : addFavoriteColor()"
        >
          <Icon :icon="isFavorite ? ICONS.favoriteSolid : ICONS.favoriteLine" />
          <span class="btn__label">
            {{
              isFavorite
                ? $t('common.removeFavoriteColor')
                : $t('common.addFavoriteColor')
            }}
          </span>
        </NTButton>
      </div>
    </div>
  </NTPopover>
</template>

<style>
.custom-color-picker {
  padding: var(--space-3);
}

/* ============================================================
 * 色片入口
 *
 * 以展示颜色本身为首要任务，装饰克制：
 *   box-shadow 仅保留外环边框 + 微投影，不叠加曲面暗影/高光，
 *   确保背景色纯净可见。
 *   hover → 边框加深 + 投影放大 + 微放大
 *   active → 按入感（投影收缩 + 微缩小）
 * ============================================================ */
.color-picker__entry {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--nt-color-picker-entry-bg);
  box-shadow:
    0 0 0 1px var(--nt-gray-medium),
    0 1px 2px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition:
    background-color var(--transition-bg),
    box-shadow var(--transition-bg),
    transform var(--transition-bg);
}

.color-picker__entry:not(.color-picker__entry--disabled):hover {
  box-shadow:
    0 0 0 1px var(--nt-gray-medium),
    0 2px 4px rgba(0, 0, 0, 0.1);
  transform: scale(1.08);
}

.color-picker__entry:not(.color-picker__entry--disabled):active {
  box-shadow:
    0 0 0 1px var(--nt-gray-medium),
    0 1px 1px rgba(0, 0, 0, 0.06);
  transform: scale(0.94);
}

.color-picker__entry--disabled {
  opacity: var(--opacity-muted);
  cursor: var(--reka-cursor-disabled);
}

/* ============================================================
 * 深色模式覆盖（原则5：双模式自适应）
 * ============================================================ */
:root[data-theme='dark'] .color-picker__entry,
.dark .color-picker__entry {
  box-shadow:
    0 0 0 1px var(--nt-gray-solid),
    0 1px 2px rgba(255, 255, 255, 0.04);
}

:root[data-theme='dark']
  .color-picker__entry:not(.color-picker__entry--disabled):hover,
.dark .color-picker__entry:not(.color-picker__entry--disabled):hover {
  box-shadow:
    0 0 0 1px var(--nt-gray-heavy),
    0 2px 4px rgba(255, 255, 255, 0.08);
}

:root[data-theme='dark']
  .color-picker__entry:not(.color-picker__entry--disabled):active,
.dark .color-picker__entry:not(.color-picker__entry--disabled):active {
  box-shadow:
    0 0 0 1px var(--nt-gray-heavy),
    0 1px 1px rgba(255, 255, 255, 0.02);
}

.color-picker__container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.picker__favorite {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 8px;
  margin-top: 2px;
  border-top: 1px solid var(--nt-gray-light);
  .reka-button {
    color: var(--var-text-primary);
  }
}
</style>
