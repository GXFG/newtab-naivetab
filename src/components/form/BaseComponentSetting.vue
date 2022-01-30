<template>
  <NForm ref="formRef" class="form__layout" label-placement="left" :label-width="100">
    <slot name="header" />

    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.style')}` }}
    </NDivider>
    <slot name="style" />

    <!-- size -->
    <NFormItem v-if="isFieldRender('margin')" :label="$t('common.margin')">
      <NSlider v-model:value="localState.style[props.cname].margin" :step="1" :min="1" :max="100" />
      <NInputNumber v-model:value="localState.style[props.cname].margin" class="setting__input-number" :step="1" :min="1" :max="100" />
    </NFormItem>
    <NFormItem v-if="isFieldRender('width')" :label="$t('common.width')">
      <NSlider v-model:value="localState.style[props.cname].width" :step="1" :min="1" :max="500" />
      <NInputNumber v-model:value="localState.style[props.cname].width" class="setting__input-number" :step="1" :min="1" :max="500" />
    </NFormItem>
    <NFormItem v-if="isFieldRender('height')" :label="$t('common.height')">
      <NSlider v-model:value="localState.style[props.cname].height" :step="1" :min="1" :max="500" />
      <NInputNumber v-model:value="localState.style[props.cname].height" class="setting__input-number" :step="1" :min="1" :max="500" />
    </NFormItem>
    <NFormItem v-if="isFieldRender('fontFamily')" :label="$t('common.font')">
      <NSelect v-model:value="localState.style[props.cname].fontFamily" :options="availableFontOptions" :render-label="selectRenderLabel" />
      <NInputNumber v-model:value="localState.style[props.cname].fontSize" class="setting__input-number" :step="1" :min="12" :max="200" />
    </NFormItem>
    <NFormItem v-if="isFieldRender('letterSpacing')" :label="$t('common.letterSpacing')">
      <NSlider v-model:value="localState.style[props.cname].letterSpacing" :step="1" :min="0" :max="20" />
      <NInputNumber v-model:value="localState.style[props.cname].letterSpacing" class="setting__input-number" :step="1" :min="0" :max="20" />
    </NFormItem>

    <!-- color -->
    <NFormItem v-if="isFieldRender('fontColor')" :label="$t('common.fontColor')">
      <NColorPicker
        v-model:value="localState.style[props.cname].fontColor[localState.common.currAppearanceCode]"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>
    <NFormItem v-if="isFieldRender('backgroundColor')" :label="$t('common.backgroundColor')">
      <NColorPicker
        v-model:value="localState.style[props.cname].backgroundColor[localState.common.currAppearanceCode]"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>
    <NFormItem v-if="isFieldRender('activeColor')" :label="$t('common.activeColor')">
      <NColorPicker
        v-model:value="localState.style[props.cname].activeColor[localState.common.currAppearanceCode]"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>
    <NFormItem v-if="isFieldRender('borderColor')" :label="$t('common.border')">
      <NSwitch v-model:value="localState.style[props.cname].isBorderEnabled" />
      <NColorPicker
        v-if="isFieldRender('isBorderEnabled')"
        v-model:value="localState.style[props.cname].borderColor[localState.common.currAppearanceCode]"
        class="setting__row-element"
        show-preview
        :swatches="swatcheColors"
      />
      <NInputNumber
        v-if="isFieldRender('borderWidth')"
        v-model:value="localState.style[props.cname].borderWidth"
        class="setting__input-number"
        :step="1"
        :min="1"
        :max="10"
      />
    </NFormItem>
    <NFormItem v-if="isFieldRender('shadowColor')" :label="$t('common.shadow')">
      <NSwitch v-model:value="localState.style[props.cname].isShadowEnabled" />
      <NColorPicker
        v-if="isFieldRender('isShadowEnabled')"
        v-model:value="localState.style[props.cname].shadowColor[localState.common.currAppearanceCode]"
        class="setting__row-element"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>

    <slot name="footer" />
  </NForm>
</template>

<script setup lang="ts">
import { localState } from '@/logic'
import { swatcheColors } from '@/styles/index'

const props = defineProps({
  cname: {
    type: String,
    required: true,
  },
  dividerName: {
    type: String,
  },
})

const isFieldRender = (field: string) => {
  return field in localState.style[props.cname]
}

const availableFontOptions = computed(() =>
  localState.common.availableFontList.map((font: string) => ({
    label: font,
    value: font,
  })),
)

const selectRenderLabel = (option: SelectStringItem) => {
  return [
    h(
      'div',
      {
        style: {
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      [
        h('span', {}, option.label),
        h(
          'span',
          {
            style: {
              fontFamily: option.label,
            },
          },
          'abc ABC 0123',
        ),
      ],
    ),
  ]
}
</script>

<style>
.form__layout {
  padding-top: 20px;
}

.n-base-select-option__content {
  width: 100% !important;
}
</style>
