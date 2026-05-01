<script setup lang="ts">
import SettingFormItem from '@/setting/components/SettingFormItem.vue'
import CustomColorPicker from '@/components/CustomColorPicker.vue'
import { useDualThemeColor } from './useDualThemeColor'

const props = defineProps<{
  label: string
  tipContent?: string
}>()

const modelValue = defineModel<string | string[]>({ required: true })

const { currentValue, updateValue } = useDualThemeColor(modelValue, (v) => {
  modelValue.value = v as string | string[]
})
</script>

<template>
  <SettingFormItem
    :label="label"
    :tip-content="tipContent"
  >
    <CustomColorPicker
      :value="currentValue"
      @update:value="updateValue"
    />
  </SettingFormItem>
</template>
