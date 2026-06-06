<script setup lang="ts">
import NTInputNumber from '@/components/ui/NTInputNumber.vue'
import SettingFormItem from '@/setting/components/SettingFormItem.vue'
import CustomColorPicker from '@/components/CustomColorPicker.vue'
import NTSwitch from '@/components/ui/NTSwitch.vue'
import { useDualThemeColor } from './useDualThemeColor'

defineProps<{
  label?: string
  disabled?: boolean
}>()

const enable = defineModel<boolean>('enable', { required: true })
const color = defineModel<string | string[]>('color')
const width = defineModel<number>('width')

const { currentValue, updateValue } = useDualThemeColor(
  computed(() => color.value as string | string[]),
  (v) => {
    color.value = v
  },
)

const showWidthInput = computed(() => width.value !== undefined)
</script>

<template>
  <!-- 注意：不传 :disabled 给 SettingFormItem（div 不支持 disabled 属性），
       禁用状态由子组件（Switch / CustomColorPicker / NTInputNumber）各自处理 -->
  <SettingFormItem :label="label">
    <Transition name="setting-slide">
      <div
        v-if="enable"
        class="setting__toggle-extra"
      >
        <CustomColorPicker
          :value="currentValue"
          :disabled="disabled"
          @update:value="updateValue"
        />
        <NTInputNumber
          v-if="showWidthInput"
          v-model:value="width"
          class="setting__num-input"
          size="small"
          :step="1"
          :min="1"
          :max="1000"
        />
      </div>
    </Transition>
    <NTSwitch
      v-model:value="enable"
      :disabled="disabled"
    />
  </SettingFormItem>
</template>
