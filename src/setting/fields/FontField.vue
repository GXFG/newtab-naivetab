<script setup lang="ts">
import NTInputNumber from '@/components/ui/NTInputNumber.vue'
import SelectFont from './SelectFont.vue'
import SettingFormItem from '@/setting/components/SettingFormItem.vue'
import CustomColorPicker from '@/components/CustomColorPicker.vue'
import { useDualThemeColor } from './useDualThemeColor'

defineProps<{
  label: string
  disabled?: boolean
}>()

const fontFamily = defineModel<string>('fontFamily')
const fontColor = defineModel<string | string[]>('fontColor')
const fontSize = defineModel<number>('fontSize')

const { currentValue, updateValue } = useDualThemeColor(
  computed(() => fontColor.value as string | string[]),
  (v) => {
    fontColor.value = v
  },
)
</script>

<template>
  <!-- 注意：不传 :disabled 给 SettingFormItem（div 不支持 disabled 属性），
       禁用状态由各子组件（CustomColorPicker / NTSelect / NTInputNumber）各自处理 -->
  <SettingFormItem :label="label">
    <CustomColorPicker
      :value="currentValue"
      :disabled="disabled"
      @update:value="updateValue"
    />
    <SelectFont
      v-model:value="fontFamily"
      size="small"
      :disabled="disabled"
    />
    <NTInputNumber
      v-model:value="fontSize"
      class="setting__num-input"
      size="small"
      :step="1"
      :min="5"
      :max="1000"
      :disabled="disabled"
    />
  </SettingFormItem>
</template>
