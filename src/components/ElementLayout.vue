<template>
  <NForm ref="formRef" label-placement="left" :label-width="100">
    <NFormItem :label="$t('common.enabled')">
      <NSwitch v-model:value="globalState.setting[props.name].enabled" />
    </NFormItem>
    <NDivider title-placement="left">
      {{ $t('common.layout') }}
    </NDivider>
    <NFormItem :label="$t('common.position')">
      <ElementLayoutSelect
        :curr-type="globalState.setting[props.name].layout.positionType"
        @onConfirm="onPositionChange"
      />
    </NFormItem>
    <NFormItem :label="$t('common.xOffset')">
      <NSlider v-model:value="globalState.setting[props.name].layout.xOffset" :step="1" />
      <NInputNumber v-model:value="globalState.setting[props.name].layout.xOffset" class="layout__input_number" size="small" :min="0" :max="100" />
    </NFormItem>
    <NFormItem :label="$t('common.yOffset')">
      <NSlider v-model:value="globalState.setting[props.name].layout.yOffset" :step="1" />
      <NInputNumber v-model:value="globalState.setting[props.name].layout.yOffset" class="layout__input_number" size="small" :min="0" :max="100" />
    </NFormItem>
  </NForm>
</template>

<script setup lang="ts">
import { NDivider, NForm, NFormItem, NSwitch, NSlider, NInputNumber } from 'naive-ui'
import ElementLayoutSelect from './ElementLayoutSelect.vue'
import { POSITION_TYPE_TO_STYLE_MAP, globalState } from '@/logic'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
})

const onPositionChange = (type: number) => {
  globalState.setting[props.name].layout.positionType = type
  globalState.setting[props.name].layout.xOffset = POSITION_TYPE_TO_STYLE_MAP[type][0].value
  globalState.setting[props.name].layout.yOffset = POSITION_TYPE_TO_STYLE_MAP[type][1].value
}

</script>

<style scoped>
.layout__input_number {
  margin-left: 10px;
  width: 120px;
}
</style>
