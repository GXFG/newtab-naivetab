<template>
  <NForm ref="formRef" label-placement="left" :label-width="100">
    <NDivider title-placement="left">
      {{ $t('common.style') }}
    </NDivider>

    <NFormItem :label="$t('common.font')">
      <NInput v-model:value="globalState.style[props.field].fontFamily" placeholder=" "></NInput>
    </NFormItem>

    <NFormItem :label="$t('common.fontSize')">
      <NSlider
        v-model:value="globalState.style[props.field].fontSize"
        :step="1"
        :min="12"
        :max="200"
      />
      <NInputNumber
        v-model:value="globalState.style[props.field].fontSize"
        class="input_number"
        :min="12"
        :step="1"
      ></NInputNumber>
    </NFormItem>
    <NFormItem v-if="globalState.style[props.field].letterSpacing" :label="$t('common.letterSpacing')">
      <NSlider
        v-model:value="globalState.style[props.field].letterSpacing"
        :step="1"
        :max="200"
      />
      <NInputNumber
        v-model:value="globalState.style[props.field].letterSpacing"
        class="input_number"
        :step="1"
      ></NInputNumber>
    </NFormItem>

    <div class="form__label">
      <label class="label__item">{{ $t('common.light') }}</label>
      <label class="label__item">{{ $t('common.dark') }}</label>
    </div>

    <NFormItem v-if="globalState.style[props.field].fontColor" :label="$t('common.fontColor')">
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].fontColor[0]" />
      </div>
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].fontColor[1]" />
      </div>
    </NFormItem>

    <NFormItem
      v-if="globalState.style[props.field].backgroundColor"
      :label="$t('common.backgroundColor')"
    >
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].backgroundColor[0]" />
      </div>
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].backgroundColor[1]" />
      </div>
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].activeColor" :label="$t('common.activeColor')">
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].activeColor[0]" />
      </div>
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].activeColor[1]" />
      </div>
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].shadowColor" :label="$t('common.shadowColor')">
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].shadowColor[0]" />
      </div>
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].shadowColor[1]" />
      </div>
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].borderColor" :label="$t('common.borderColor')">
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].borderColor[0]" />
      </div>
      <div class="color__picker">
        <NColorPicker v-model:value="globalState.style[props.field].borderColor[1]" />
      </div>
    </NFormItem>

    <slot></slot>
  </NForm>
</template>

<script setup lang="ts">
import { NDivider, NForm, NFormItem, NInput, NInputNumber, NSlider, NColorPicker } from 'naive-ui'
import { globalState } from '@/logic'

const props = defineProps({
  field: {
    type: String,
    required: true,
  },
})

</script>

<style scoped>
.color__picker {
  display: flex;
  justify-content: center;
  align-items: center;
  &:nth-of-type(2) {
    margin-left: 10px;
  }
  flex: 1;
}
.form__label {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  .label__item {
    opacity: 0.6;
    &:nth-of-type(1) {
      margin-left: 23%;
    }
    &:nth-of-type(2) {
      margin-right: 31%;
    }
  }
}
</style>
