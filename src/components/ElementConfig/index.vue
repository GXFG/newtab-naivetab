<template>
  <NForm ref="formRef" label-placement="left" :label-width="100">
    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.style')}` }}
    </NDivider>

    <NFormItem v-if="globalState.style[props.field].margin" :label="$t('common.margin')">
      <NSlider v-model:value="globalState.style[props.field].margin" :step="1" :min="1" :max="100" />
      <NInputNumber v-model:value="globalState.style[props.field].margin" class="setting__input-number" :step="1" :min="1" :max="100" />
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].width" :label="$t('common.width')">
      <NSlider v-model:value="globalState.style[props.field].width" :step="1" :min="1" :max="500" />
      <NInputNumber v-model:value="globalState.style[props.field].width" class="setting__input-number" :step="1" :min="1" :max="500" />
    </NFormItem>

    <NFormItem v-if="'fontFamily' in globalState.style[props.field]" :label="$t('common.font')">
      <NInput v-model:value="globalState.style[props.field].fontFamily" placeholder=" " @blur="onFontBlur"></NInput>
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].fontSize" :label="$t('common.fontSize')">
      <NSlider v-model:value="globalState.style[props.field].fontSize" :step="1" :min="12" :max="200" />
      <NInputNumber v-model:value="globalState.style[props.field].fontSize" class="setting__input-number" :min="12" :step="1" />
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].letterSpacing" :label="$t('common.letterSpacing')">
      <NSlider v-model:value="globalState.style[props.field].letterSpacing" :step="1" :max="200" />
      <NInputNumber v-model:value="globalState.style[props.field].letterSpacing" class="setting__input-number" :step="1" />
    </NFormItem>

    <!-- color -->
    <NFormItem v-if="globalState.style[props.field].fontColor" :label="$t('common.fontColor')">
      <NColorPicker v-model:value="globalState.style[props.field].fontColor[globalState.localState.currThemeCode]" show-preview :swatches="swatches" />
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].backgroundColor" :label="$t('common.backgroundColor')">
      <NColorPicker v-model:value="globalState.style[props.field].backgroundColor[globalState.localState.currThemeCode]" show-preview :swatches="swatches" />
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].activeColor" :label="$t('common.activeColor')">
      <NColorPicker v-model:value="globalState.style[props.field].activeColor[globalState.localState.currThemeCode]" show-preview :swatches="swatches" />
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].borderColor" :label="$t('common.borderColor')">
      <NSwitch v-model:value="globalState.style[props.field].isBorderEnabled" />
      <NColorPicker v-if="globalState.style[props.field].isBorderEnabled" v-model:value="globalState.style[props.field].borderColor[globalState.localState.currThemeCode]" class="setting__row-element" show-preview :swatches="swatches" />
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].shadowColor" :label="$t('common.shadowColor')">
      <NSwitch v-model:value="globalState.style[props.field].isShadowEnabled" />
      <NColorPicker v-if="globalState.style[props.field].isShadowEnabled" v-model:value="globalState.style[props.field].shadowColor[globalState.localState.currThemeCode]" class="setting__row-element" show-preview :swatches="swatches" />
    </NFormItem>

    <slot></slot>
  </NForm>
</template>

<script setup lang="ts">
import { NDivider, NForm, NFormItem, NInput, NInputNumber, NSwitch, NSlider, NColorPicker } from 'naive-ui'
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

const swatches = ['rgba(255, 255, 255, 1)', 'rgba(209, 213, 219, 1)', 'rgba(71,85,105, 1)', 'rgba(44, 62, 80, 1)', 'rgba(113, 113, 113, 1)', 'rgba(53, 54, 58, 1)', 'rgba(15, 23, 42, 1)']

const onFontBlur = (value: any) => {
  gaEvent(`${props.field}-font`, 'blur', `${value.target.value}`)
}
</script>
