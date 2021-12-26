<template>
  <NForm ref="formRef" class="form__layout" label-placement="left" :label-width="100">
    <NFormItem v-if="'enabled' in globalState.setting[props.field]" :label="$t('common.enabled')">
      <NSwitch v-model:value="globalState.setting[props.field].enabled" @update:value="onEnabledSwitchUpdate" />
    </NFormItem>

    <slot></slot>

    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.layout')}` }}
    </NDivider>
    <NFormItem :label="$t('common.position')">
      <LayoutSelect
        :curr-type="globalState.setting[props.field].layout.positionType"
        @onConfirm="onPositionChange"
      />
      <Tips :content="$t('common.positionTips')" />
    </NFormItem>
    <NFormItem :label="$t('common.xOffset')">
      <NSlider v-model:value="globalState.setting[props.field].layout.xOffsetValue" :step="1" @update:value="onXOffsetUpdate" />
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
      <NSlider v-model:value="globalState.setting[props.field].layout.yOffsetValue" :step="1" @update:value="onYOffsetUpdate" />
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
import LayoutSelect from './LayoutSelect.vue'
import { gaEvent, POSITION_TYPE_TO_STYLE_MAP, globalState } from '@/logic'

const props = defineProps({
  field: {
    type: String,
    required: true,
  },
  dividerName: {
    type: String,
  },
})

const onPositionChange = (type: number) => {
  globalState.setting[props.field].layout.positionType = type
  globalState.setting[props.field].layout.xOffset = POSITION_TYPE_TO_STYLE_MAP[type][0].value
  globalState.setting[props.field].layout.yOffset = POSITION_TYPE_TO_STYLE_MAP[type][1].value
  gaEvent(`${props.field}-positionType`, 'click', `${type}`)
}

const onEnabledSwitchUpdate = (value: boolean) => {
  gaEvent(`${props.field}-enabled`, 'click', `${value}`)
}

const onXOffsetUpdate = (value: number) => {
  // gaEvent(`${props.field}-XOffset`, 'slide', `${value}`)
}

const onYOffsetUpdate = (value: number) => {
  // gaEvent(`${props.field}-YOffset`, 'slide', `${value}`)
}

</script>

<style>
.form__layout {
  padding-top: 20px;
}
</style>
