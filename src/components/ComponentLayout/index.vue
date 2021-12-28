<template>
  <NForm ref="formRef" class="form__layout" label-placement="left" :label-width="100">
    <NFormItem v-if="'enabled' in globalState.setting[props.field]" :label="$t('common.enabled')">
      <NSwitch v-model:value="globalState.setting[props.field].enabled" @update:value="onEnabledSwitchUpdate" />
    </NFormItem>

    <slot></slot>

    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.layout')}` }}
    </NDivider>
    <!-- <NFormItem :label="$t('common.position')">
      <LayoutSelect :field="props.field" />
      <Tips :content="$t('common.positionTips')" />
    </NFormItem> -->
    <NFormItem :label="$t('common.xOffset')">
      <NSlider v-model:value="globalState.setting[props.field].layout.xOffsetValue" :step="1" :max="50" />
      <NInputNumber
        v-model:value="globalState.setting[props.field].layout.xOffsetValue"
        class="setting__input_number"
        size="small"
        :step="1"
        :min="0"
        :max="100"
      />
      <Tips :content="$t('common.xOffsetTips')" />
    </NFormItem>
    <NFormItem :label="$t('common.yOffset')">
      <NSlider v-model:value="globalState.setting[props.field].layout.yOffsetValue" :step="1" :max="50" />
      <NInputNumber
        v-model:value="globalState.setting[props.field].layout.yOffsetValue"
        class="setting__input_number"
        size="small"
        :step="1"
        :min="0"
        :max="100"
      />
      <Tips :content="$t('common.yOffsetTips')" />
    </NFormItem>
  </NForm>
</template>

<script setup lang="ts">
import { NDivider, NForm, NFormItem, NSwitch, NSlider, NInputNumber } from 'naive-ui'
// import LayoutSelect from './LayoutSelect.vue'
import { gaEvent, globalState } from '@/logic'

const props = defineProps({
  field: {
    type: String,
    required: true,
  },
  dividerName: {
    type: String,
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
