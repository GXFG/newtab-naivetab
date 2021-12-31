<template>
  <NForm ref="formRef" class="form__layout" label-placement="left" :label-width="100">
    <NFormItem v-if="'enabled' in globalState.setting[props.field]" :label="$t('common.enabled')">
      <NSwitch v-model:value="globalState.setting[props.field].enabled" @update:value="onEnabledSwitchUpdate" />
    </NFormItem>

    <slot></slot>
  </NForm>
</template>

<script setup lang="ts">
import { NForm, NFormItem, NSwitch } from 'naive-ui'
import { gaEvent, globalState } from '@/logic'

const props = defineProps({
  field: {
    type: String,
    required: true,
  },
})

const onEnabledSwitchUpdate = (value: boolean) => {
  gaEvent(`${props.field}-enabled`, 'click', `${value}`)
}
</script>

<style>
.form__layout {
  padding-top: 20px;
}
</style>
