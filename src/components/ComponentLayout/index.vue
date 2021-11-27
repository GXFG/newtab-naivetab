<template>
  <NForm ref="formRef" label-placement="left" :label-width="100">
    <NDivider title-placement="left">
      {{ $t('common.config') }}
    </NDivider>
    <NFormItem :label="$t('common.enabled')">
      <NSwitch v-model:value="globalState.setting[props.field].enabled" />
    </NFormItem>

    <slot></slot>

    <NDivider title-placement="left">
      {{ $t('common.layout') }}
    </NDivider>
    <NFormItem :label="$t('common.position')">
      <LayoutSelect
        :curr-type="globalState.setting[props.field].layout.positionType"
        @onConfirm="onPositionChange"
      />
    </NFormItem>
    <NFormItem :label="$t('common.xOffset')">
      <NSlider v-model:value="globalState.setting[props.field].layout.xOffset" :step="1" />
      <NInputNumber
        v-model:value="globalState.setting[props.field].layout.xOffset"
        class="setting__input-number"
        size="small"
        :step="1"
        :min="0"
        :max="100"
      />
    </NFormItem>
    <NFormItem :label="$t('common.yOffset')">
      <NSlider v-model:value="globalState.setting[props.field].layout.yOffset" :step="1" />
      <NInputNumber
        v-model:value="globalState.setting[props.field].layout.yOffset"
        class="setting__input-number"
        size="small"
        :step="1"
        :min="0"
        :max="100"
      />
    </NFormItem>
  </NForm>
</template>

<script setup lang="ts">
import { NDivider, NForm, NFormItem, NSwitch, NSlider, NInputNumber } from 'naive-ui'
import LayoutSelect from './LayoutSelect.vue'
import { POSITION_TYPE_TO_STYLE_MAP, globalState } from '@/logic'

const props = defineProps({
  field: {
    type: String,
    required: true,
  },
})

const onPositionChange = (type: number) => {
  globalState.setting[props.field].layout.positionType = type
  globalState.setting[props.field].layout.xOffset = POSITION_TYPE_TO_STYLE_MAP[type][0].value
  globalState.setting[props.field].layout.yOffset = POSITION_TYPE_TO_STYLE_MAP[type][1].value
}

</script>
