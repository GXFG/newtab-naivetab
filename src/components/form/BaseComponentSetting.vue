<template>
  <NForm ref="formRef" class="form__layout" label-placement="left" :label-width="100">
    <slot name="header" />

    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.style')}` }}
    </NDivider>
    <slot name="style" />

    <!-- size -->
    <NFormItem v-if="isFieldRender('margin')" :label="$t('common.margin')">
      <NSlider v-model:value="globalState.style[props.cname].margin" :step="1" :min="1" :max="100" />
      <NInputNumber v-model:value="globalState.style[props.cname].margin" class="setting__input-number" :step="1" :min="1" :max="100" />
    </NFormItem>
    <NFormItem v-if="isFieldRender('width')" :label="$t('common.width')">
      <NSlider v-model:value="globalState.style[props.cname].width" :step="1" :min="1" :max="500" />
      <NInputNumber v-model:value="globalState.style[props.cname].width" class="setting__input-number" :step="1" :min="1" :max="500" />
    </NFormItem>
    <NFormItem v-if="isFieldRender('fontFamily')" :label="$t('common.font')">
      <NSelect v-model:value="globalState.style[props.cname].fontFamily" :options="availableFontOptions" :render-label="selectRenderLabel" />
    </NFormItem>
    <NFormItem v-if="isFieldRender('fontSize')" :label="$t('common.fontSize')">
      <NSlider v-model:value="globalState.style[props.cname].fontSize" :step="1" :min="12" :max="200" />
      <NInputNumber v-model:value="globalState.style[props.cname].fontSize" class="setting__input-number" :step="1" :min="12" :max="200" />
    </NFormItem>
    <NFormItem v-if="isFieldRender('letterSpacing')" :label="$t('common.letterSpacing')">
      <NSlider v-model:value="globalState.style[props.cname].letterSpacing" :step="1" :min="0" :max="20" />
      <NInputNumber v-model:value="globalState.style[props.cname].letterSpacing" class="setting__input-number" :step="1" :min="0" :max="20" />
    </NFormItem>

    <!-- color -->
    <NFormItem v-if="isFieldRender('fontColor')" :label="$t('common.fontColor')">
      <NColorPicker
        v-model:value="globalState.style[props.cname].fontColor[globalState.localState.currThemeCode]"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>
    <NFormItem v-if="isFieldRender('backgroundColor')" :label="$t('common.backgroundColor')">
      <NColorPicker
        v-model:value="globalState.style[props.cname].backgroundColor[globalState.localState.currThemeCode]"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>
    <NFormItem v-if="isFieldRender('activeColor')" :label="$t('common.activeColor')">
      <NColorPicker
        v-model:value="globalState.style[props.cname].activeColor[globalState.localState.currThemeCode]"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>
    <NFormItem v-if="isFieldRender('borderColor')" :label="$t('common.borderColor')">
      <NSwitch v-model:value="globalState.style[props.cname].isBorderEnabled" />
      <NColorPicker
        v-if="isFieldRender('isBorderEnabled')"
        v-model:value="globalState.style[props.cname].borderColor[globalState.localState.currThemeCode]"
        class="setting__row-element"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>
    <NFormItem v-if="isFieldRender('shadowColor')" :label="$t('common.shadowColor')">
      <NSwitch v-model:value="globalState.style[props.cname].isShadowEnabled" />
      <NColorPicker
        v-if="isFieldRender('isShadowEnabled')"
        v-model:value="globalState.style[props.cname].shadowColor[globalState.localState.currThemeCode]"
        class="setting__row-element"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>

    <slot name="footer" />
  </NForm>
</template>

<script setup lang="ts">
import { globalState } from '@/logic'
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
  return field in globalState.style[props.cname]
}

const availableFontOptions = computed(() =>
  globalState.localState.availableFontList.map((font: string) => ({
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
          'abcd-ABCD-0123',
        ),
      ],
    ),
  ]
}
</script>

<style scoped>
.form__layout {
  padding-top: 20px;
}
..n-base-select-menu .n-base-select-option .n-base-select-option__content {
  width: 100%;
}
</style>
