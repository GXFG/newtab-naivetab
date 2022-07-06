<template>
  <NForm ref="formRef" class="form__layout" label-placement="left" :label-width="100">
    <slot name="header" />

    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.style')}` }}
    </NDivider>
    <slot name="style" />

    <!-- size -->
    <NFormItem v-if="isRenderField('margin')" :label="$t('common.margin')">
      <NSlider v-model:value="localConfig[props.cname].margin" :step="1" :min="1" :max="100" />
      <NInputNumber v-model:value="localConfig[props.cname].margin" class="setting__input-number" :step="1" :min="1" :max="100" />
    </NFormItem>
    <NFormItem v-if="isRenderField('width')" :label="$t('common.width')">
      <NSlider v-model:value="localConfig[props.cname].width" :step="1" :min="1" :max="1000" />
      <NInputNumber v-model:value="localConfig[props.cname].width" class="setting__input-number" :step="1" :min="1" :max="500" />
    </NFormItem>
    <NFormItem v-if="isRenderField('height')" :label="$t('common.height')">
      <NSlider v-model:value="localConfig[props.cname].height" :step="1" :min="1" :max="1000" />
      <NInputNumber v-model:value="localConfig[props.cname].height" class="setting__input-number" :step="1" :min="1" :max="500" />
    </NFormItem>
    <NFormItem v-if="isRenderField('borderRadius')" :label="$t('common.borderRadius')">
      <NSlider v-model:value="localConfig[props.cname].borderRadius" :step="1" :min="0" :max="200" />
      <NInputNumber v-model:value="localConfig[props.cname].borderRadius" class="setting__input-number" :step="1" :min="0" :max="200" />
    </NFormItem>
    <NFormItem v-if="isRenderField('fontFamily')" :label="$t('common.font')">
      <NSelect v-model:value="localConfig[props.cname].fontFamily" :options="availableFontOptions" :render-label="fontSelectRenderLabel" />
      <NInputNumber v-model:value="localConfig[props.cname].fontSize" class="setting__input-number" :step="1" :min="12" :max="200" />
    </NFormItem>
    <NFormItem v-if="isRenderField('letterSpacing')" :label="$t('common.letterSpacing')">
      <NSlider v-model:value="localConfig[props.cname].letterSpacing" :step="1" :min="0" :max="20" />
      <NInputNumber v-model:value="localConfig[props.cname].letterSpacing" class="setting__input-number" :step="1" :min="0" :max="20" />
    </NFormItem>

    <!-- color -->
    <NFormItem v-if="isRenderField('primaryColor')" :label="$t('common.primaryColor')">
      <NColorPicker v-model:value="localConfig[props.cname].primaryColor[localState.currAppearanceCode]" show-preview :swatches="swatcheColors" />
      <Tips :content="$t('general.primaryColorTips')" />
    </NFormItem>
    <NFormItem v-if="isRenderField('fontColor')" :label="$t('common.fontColor')">
      <NColorPicker v-model:value="localConfig[props.cname].fontColor[localState.currAppearanceCode]" show-preview :swatches="swatcheColors" />
    </NFormItem>
    <NFormItem v-if="isRenderField('backgroundColor')" :label="$t('common.backgroundColor')">
      <NColorPicker v-model:value="localConfig[props.cname].backgroundColor[localState.currAppearanceCode]" show-preview :swatches="swatcheColors" />
    </NFormItem>
    <NFormItem v-if="isRenderField('activeColor')" :label="$t('common.activeColor')">
      <NColorPicker v-model:value="localConfig[props.cname].activeColor[localState.currAppearanceCode]" show-preview :swatches="swatcheColors" />
    </NFormItem>
    <NFormItem v-if="isRenderField('borderColor')" :label="$t('common.border')">
      <NSwitch v-model:value="localConfig[props.cname].isBorderEnabled" />
      <NColorPicker
        v-if="isRenderField('isBorderEnabled')"
        v-model:value="localConfig[props.cname].borderColor[localState.currAppearanceCode]"
        class="setting__row-element"
        show-preview
        :swatches="swatcheColors"
      />
      <NInputNumber
        v-if="isRenderField('borderWidth')"
        v-model:value="localConfig[props.cname].borderWidth"
        class="setting__input-number"
        :step="1"
        :min="1"
        :max="10"
      />
    </NFormItem>
    <NFormItem v-if="isRenderField('shadowColor')" :label="$t('common.shadow')">
      <NSwitch v-model:value="localConfig[props.cname].isShadowEnabled" />
      <NColorPicker
        v-if="isRenderField('isShadowEnabled')"
        v-model:value="localConfig[props.cname].shadowColor[localState.currAppearanceCode]"
        class="setting__row-element"
        show-preview
        :swatches="swatcheColors"
      />
    </NFormItem>

    <slot name="footer" />
  </NForm>
</template>

<script setup lang="ts">
import { localConfig, localState, globalState } from '@/logic'
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

const isRenderField = (field: string) => {
  return field in localConfig[props.cname]
}

const availableFontOptions = computed(() =>
  globalState.availableFontList.map((font: string) => ({
    label: font,
    value: font,
  })),
)

const fontSelectRenderLabel = (option: SelectStringItem) => {
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
