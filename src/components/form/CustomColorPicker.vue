<script setup lang="ts">
import { swatcheColors } from '@/styles/const'

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

const backgroundColor = computed(() => props.value)
</script>

<template>
  <n-popover
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
        :swatches="swatcheColors"
        placement="bottom"
        @update:value="handleColorUpdate"
      />
    </div>
  </n-popover>
</template>

<style>
.color-picker__entry {
  width: 22px;
  height: 22px;
  border-radius: 2px;
  border: 1px solid #ccc;
  background-color: v-bind(backgroundColor);
  cursor: pointer;
}

.color-picker__container {
  width: 230px;
  height: 367px;
}
</style>
