<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
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

const isFavorite = computed(() =>
  localConfig.general.swatcheColors.includes(props.value),
)

const addFavoriteColor = () => {
  if (isFavorite.value) {
    return
  }
  if (localConfig.general.swatcheColors.length >= FAVORITE_SWATCHE_MAX_COUNT) {
    showToast.error(window.$t('prompts.favoriteLimit'))
    return
  }
  localConfig.general.swatcheColors.push(props.value)
}

const removeFavoriteColor = () => {
  if (!isFavorite.value) {
    return
  }
  const targetIndex = localConfig.general.swatcheColors.indexOf(props.value)
  localConfig.general.swatcheColors.splice(targetIndex, 1)
}
</script>

<template>
  <NTPopover
    trigger="click"
    placement="top"
    class="custom-color-picker"
  >
    <template #trigger>
      <div
        class="color-picker__entry"
        :class="props.class"
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

.color-picker__entry {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--nt-gray-light);
  background-color: var(--nt-color-picker-entry-bg);
  cursor: pointer;
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
