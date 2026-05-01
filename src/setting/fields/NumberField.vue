<script setup lang="ts">
import SettingFormItem from '@/setting/components/SettingFormItem.vue'

const props = withDefaults(
  defineProps<{
    label: string
    min?: number
    max?: number
    step?: number
    showSlider?: boolean
  }>(),
  {
    min: 0,
    max: 1000,
    step: 1,
    showSlider: false,
  },
)

const modelValue = defineModel<number>({ required: true })
</script>

<template>
  <SettingFormItem :label="label">
    <div class="slider-input">
      <NSlider
        v-if="props.showSlider"
        v-model:value="modelValue"
        :step="props.step"
        :min="props.min"
        :max="props.max"
        :tooltip="false"
      />
      <NInputNumber
        v-model:value="modelValue"
        class="setting__num-input"
        size="small"
        :step="props.step"
        :min="props.min"
        :max="props.max"
      />
    </div>
  </SettingFormItem>
</template>

<style scoped>
.slider-input {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-2);
}
</style>
