<template>
  <NForm ref="formRef" label-placement="left" :label-width="100">
    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.style')}` }}
    </NDivider>

    <NFormItem v-if="globalState.style[props.field].margin" :label="$t('common.margin')">
      <NSlider v-model:value="globalState.style[props.field].margin" :step="1" :min="1" :max="100" />
      <NInputNumber
        v-model:value="globalState.style[props.field].margin"
        class="setting__input-number"
        :step="1"
        :min="1"
        :max="100"
      ></NInputNumber>
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].width" :label="$t('common.width')">
      <NSlider v-model:value="globalState.style[props.field].width" :step="1" :min="45" :max="200" />
      <NInputNumber
        v-model:value="globalState.style[props.field].width"
        class="setting__input-number"
        :step="1"
        :min="45"
        :max="200"
      ></NInputNumber>
    </NFormItem>

    <NFormItem v-if="'fontFamily' in globalState.style[props.field]" :label="$t('common.font')">
      <NInput v-model:value="globalState.style[props.field].fontFamily" placeholder=" " @blur="onFontBlur"></NInput>
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].fontSize" :label="$t('common.fontSize')">
      <NSlider
        v-model:value="globalState.style[props.field].fontSize"
        :step="1"
        :min="12"
        :max="200"
      />
      <NInputNumber
        v-model:value="globalState.style[props.field].fontSize"
        class="setting__input-number"
        :min="12"
        :step="1"
      ></NInputNumber>
    </NFormItem>

    <NFormItem
      v-if="globalState.style[props.field].letterSpacing"
      :label="$t('common.letterSpacing')"
    >
      <NSlider v-model:value="globalState.style[props.field].letterSpacing" :step="1" :max="200" />
      <NInputNumber
        v-model:value="globalState.style[props.field].letterSpacing"
        class="setting__input-number"
        :step="1"
      ></NInputNumber>
    </NFormItem>

    <div v-if="isColorLabelVisible" class="form__label">
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

    <NFormItem v-if="globalState.style[props.field].borderColor" :label="$t('common.borderColor')">
      <NSwitch v-model:value="globalState.style[props.field].isBorderEnabled" />
      <div class="color__picker">
        <NColorPicker
          v-if="globalState.style[props.field].isBorderEnabled"
          v-model:value="globalState.style[props.field].borderColor[0]"
        />
      </div>
      <div class="color__picker setting__row-element">
        <NColorPicker
          v-if="globalState.style[props.field].isBorderEnabled"
          v-model:value="globalState.style[props.field].borderColor[1]"
        />
      </div>
    </NFormItem>

    <NFormItem v-if="globalState.style[props.field].shadowColor" :label="$t('common.shadowColor')">
      <NSwitch v-model:value="globalState.style[props.field].isShadowEnabled" />
      <div class="color__picker">
        <NColorPicker
          v-if="globalState.style[props.field].isShadowEnabled"
          v-model:value="globalState.style[props.field].shadowColor[0]"
        />
      </div>
      <div class="color__picker setting__row-element">
        <NColorPicker
          v-if="globalState.style[props.field].isShadowEnabled"
          v-model:value="globalState.style[props.field].shadowColor[1]"
        />
      </div>
    </NFormItem>
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

const onFontBlur = (value: any) => {
  gaEvent(`${props.field}-font`, 'blur', `${value.target.value}`)
}

const isColorLabelVisible = computed(() => {
  return globalState.style[props.field].fontColor
  || globalState.style[props.field].backgroundColor
  || globalState.style[props.field].activeColor
  || globalState.style[props.field].borderColor
  || globalState.style[props.field].shadowColor
})

</script>

<style scoped>
.color__picker {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  &:nth-of-type(2) {
    margin-left: 10px;
  }
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
