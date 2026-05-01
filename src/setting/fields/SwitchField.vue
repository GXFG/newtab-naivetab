<script setup lang="ts">
import { NSwitch } from 'naive-ui'
import SettingFormItem from '@/setting/components/SettingFormItem.vue'

const props = withDefaults(
  defineProps<{
    label: string
    tipContent?: string
    tipLink?: string
    disabled?: boolean
  }>(),
  {
    tipContent: undefined,
    tipLink: undefined,
    disabled: false,
  },
)

const modelValue = defineModel<boolean>({ required: true })
</script>

<template>
  <SettingFormItem
    :label="label"
    :tip-content="tipContent"
    :tip-link="tipLink"
  >
    <Transition name="setting-slide">
      <div
        v-if="modelValue && $slots.extra"
        class="setting__toggle-extra"
      >
        <slot name="extra" />
      </div>
    </Transition>
    <NSwitch
      :value="modelValue"
      size="small"
      :disabled="disabled"
      @update:value="modelValue = $event"
    />
  </SettingFormItem>
</template>
