<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { FAVORITE_SWATCHE_MAX_COUNT } from '@/logic/constants/app'
import { localConfig } from '@/logic/store'

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

const handleColorUpdate = (value: string) => {
  emit('update:value', value)
}

const isPickerVisible = ref(false)

const handleUpdatePopoverShow = async (value: boolean) => {
  await nextTick()
  isPickerVisible.value = value
}

const isFavorite = computed(() =>
  localConfig.general.swatcheColors.includes(props.value),
)

const addFavoriteColor = () => {
  if (isFavorite.value) {
    return
  }
  if (localConfig.general.swatcheColors.length >= FAVORITE_SWATCHE_MAX_COUNT) {
    window.$message.error(window.$t('prompts.favoriteLimit'))
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
  <n-popover
    id="custom-color-picker"
    placement="top"
    trigger="click"
    @update:show="handleUpdatePopoverShow"
  >
    <template #trigger>
      <div
        class="color-picker__entry"
        :class="props.class"
        :style="cssVars"
      />
    </template>

    <div class="color-picker__container">
      <NColorPicker
        :value="props.value"
        :show="isPickerVisible"
        :swatches="localConfig.general.swatcheColors"
        placement="top"
        @update:value="handleColorUpdate"
      />
      <div class="picker__favorite">
        <NButton
          v-if="!isFavorite"
          type="primary"
          text
          class="favorite__btn"
          @click="addFavoriteColor"
        >
          <Icon
            :icon="ICONS.favoriteLine"
            class="btn__icon"
          />
        </NButton>
        <NButton
          v-else
          type="primary"
          text
          class="favorite__btn"
          @click="removeFavoriteColor"
        >
          <Icon
            :icon="ICONS.favoriteSolid"
            class="btn__icon"
          />
        </NButton>
      </div>
    </div>
  </n-popover>
</template>

<style>
.color-picker__entry {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid #ccc;
  background-color: var(--nt-color-picker-entry-bg);
  cursor: pointer;
}

#custom-color-picker {
  padding: 10px !important;
  .v-binder-follower-content {
    transform: translateX(10px) translateY(10px) !important;
  }
  .n-color-picker-panel {
    margin: 0 !important;
    box-shadow: none !important;
    border: var(--n-border);
  }

  .color-picker__container {
    position: relative;
    width: 240px;
    height: 399px;
    .n-color-picker {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 213px;
    }
    .picker__favorite {
      position: absolute;
      right: 0;
      bottom: 0;
      .favorite__btn {
        font-size: 18px;
      }
    }
  }
}
</style>
