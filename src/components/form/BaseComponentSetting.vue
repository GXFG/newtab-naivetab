<template>
  <NForm ref="formRef" class="form__layout" label-placement="left" :label-width="100">
    <slot name="header" />

    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.style')}` }}
    </NDivider>
    <slot name="style" />

    <!-- size -->
    <NFormItem v-if="globalState.style[props.field].margin" :label="$t('common.margin')">
      <NSlider v-model:value="globalState.style[props.field].margin" :step="1" :min="1" :max="100" />
      <NInputNumber v-model:value="globalState.style[props.field].margin" class="setting__input-number" :step="1" :min="1" :max="100" />
    </NFormItem>
    <NFormItem v-if="globalState.style[props.field].width" :label="$t('common.width')">
      <NSlider v-model:value="globalState.style[props.field].width" :step="1" :min="1" :max="500" />
      <NInputNumber v-model:value="globalState.style[props.field].width" class="setting__input-number" :step="1" :min="1" :max="500" />
    </NFormItem>
    <NFormItem v-if="'fontFamily' in globalState.style[props.field]" :label="$t('common.font')">
      <NInput v-model:value="globalState.style[props.field].fontFamily" placeholder=" " @blur="onFontBlur" />
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
      <NColorPicker v-model:value="globalState.style[props.field].fontColor[globalState.localState.currThemeCode]" show-preview :swatches="swatcheColors" />
    </NFormItem>
    <NFormItem v-if="globalState.style[props.field].backgroundColor" :label="$t('common.backgroundColor')">
      <NColorPicker v-model:value="globalState.style[props.field].backgroundColor[globalState.localState.currThemeCode]" show-preview :swatches="swatcheColors" />
    </NFormItem>
    <NFormItem v-if="globalState.style[props.field].activeColor" :label="$t('common.activeColor')">
      <NColorPicker v-model:value="globalState.style[props.field].activeColor[globalState.localState.currThemeCode]" show-preview :swatches="swatcheColors" />
    </NFormItem>
    <NFormItem v-if="globalState.style[props.field].borderColor" :label="$t('common.borderColor')">
      <NSwitch v-model:value="globalState.style[props.field].isBorderEnabled" />
      <NColorPicker
        v-if="globalState.style[props.field].isBorderEnabled"
        v-model:value="globalState.style[props.field].borderColor[globalState.localState.currThemeCode]"
        class="setting__row-element"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>
    <NFormItem v-if="globalState.style[props.field].shadowColor" :label="$t('common.shadowColor')">
      <NSwitch v-model:value="globalState.style[props.field].isShadowEnabled" />
      <NColorPicker
        v-if="globalState.style[props.field].isShadowEnabled"
        v-model:value="globalState.style[props.field].shadowColor[globalState.localState.currThemeCode]"
        class="setting__row-element"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>

    <slot name="footer" />
  </NForm>
</template>

<script setup lang="ts">
import { gaEvent, globalState } from '@/logic'
import { swatcheColors } from '@/styles/index'

const props = defineProps({
  field: {
    type: String,
    required: true,
  },
  dividerName: {
    type: String,
  },
})

const onFontBlur = (value: any) => {
  gaEvent(`${props.field}-font`, 'blur', `${value.target.value}`)
}
</script>

<style scoped>
.form__layout {
  padding-top: 20px;
}
</style>
