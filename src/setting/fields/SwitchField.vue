<script setup lang="ts">
import SettingFormItem from '@/setting/components/SettingFormItem.vue'
import NTSwitch from '@/components/ui/NTSwitch.vue'

const props = withDefaults(
  defineProps<{
    label: string
    tipContent?: string
    tipLink?: string
    disabled?: boolean
    warningMessage?: string
  }>(),
  {
    tipContent: undefined,
    tipLink: undefined,
    disabled: false,
    warningMessage: undefined,
  },
)

const modelValue = defineModel<boolean>({ required: true })
</script>

<template>
  <SettingFormItem
    :label="label"
    :tip-content="tipContent"
    :tip-link="tipLink"
    :warning-message="warningMessage"
  >
    <Transition name="setting-slide">
      <div
        v-if="modelValue && $slots.extra"
        class="setting__toggle-extra"
      >
        <slot name="extra" />
      </div>
    </Transition>
    <NTSwitch
      v-model:value="modelValue"
      :disabled="disabled"
    />
  </SettingFormItem>
</template>
