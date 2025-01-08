<script setup lang="ts">
import { FAVORITE_SWATCHE_MAX_COUNT } from '@/logic/const'
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

const emit = defineEmits(['update:value'])

const handleColorUpdate = (value: string) => {
  emit('update:value', value)
}

const isPickerVisible = ref(false)

const handleUpdatePopoverShow = async (value: boolean) => {
  await nextTick()
  isPickerVisible.value = value
}

const isFavorite = computed(() => localConfig.general.swatcheColors.includes(props.value))

const addFavoriteColor = () => {
  if (isFavorite.value) {
    return
  }
  if (localConfig.general.swatcheColors.length >= FAVORITE_SWATCHE_MAX_COUNT) {
    window.$message.error(window.$t('prompts.favoriteLimt'))
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

const customEntryBackgroundColor = computed(() => props.value)
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
          <clarity:favorite-line class="btn__icon" />
        </NButton>
        <NButton
          v-else
          type="primary"
          text
          class="favorite__btn"
          @click="removeFavoriteColor"
        >
          <clarity:favorite-solid class="btn__icon" />
        </NButton>
      </div>
    </div>
  </n-popover>
</template>

<style>
.color-picker__entry {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid #ccc;
  background-color: v-bind(customEntryBackgroundColor);
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
    /* height: 394px; */
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
