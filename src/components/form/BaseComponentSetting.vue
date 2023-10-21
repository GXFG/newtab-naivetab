<script setup lang="ts">
import { localConfig, localState, availableFontOptions, fontSelectRenderLabel } from '@/logic/store'

const props = defineProps({
  cname: {
    type: String,
    required: true,
  },
  dividerName: {
    type: String,
    default: '',
  },
  marginRange: {
    type: Array as () => number[],
    default: () => [0, 100],
  },
  paddingRange: {
    type: Array as () => number[],
    default: () => [0, 100],
  },
  widthRange: {
    type: Array as () => number[],
    default: () => [10, 100],
  },
  heightRange: {
    type: Array as () => number[],
    default: () => [10, 100],
  },
  borderRadiusRange: {
    type: Array as () => number[],
    default: () => [0, 100],
  },
})

const isRenderField = (field: string) => {
  return field in localConfig[props.cname]
}
</script>

<template>
  <NForm
    label-placement="left"
    :label-width="120"
    :show-feedback="false"
  >
    <slot name="header" />

    <NDivider title-placement="left">
      {{ `${dividerName ? dividerName : $t('common.style')}` }}
    </NDivider>
    <slot name="style" />

    <!-- size -->
    <NFormItem
      v-if="isRenderField('margin')"
      :label="$t('common.margin')"
    >
      <NSlider
        v-model:value="localConfig[props.cname].margin"
        :step="0.1"
        :min="props.marginRange[0]"
        :max="props.marginRange[1]"
      />
      <NInputNumber
        v-model:value="localConfig[props.cname].margin"
        class="setting__item-element setting__input-number"
        :step="0.1"
        :min="props.marginRange[0]"
        :max="props.marginRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('padding')"
      :label="$t('common.padding')"
    >
      <NSlider
        v-model:value="localConfig[props.cname].padding"
        :step="0.1"
        :min="props.paddingRange[0]"
        :max="props.paddingRange[1]"
      />
      <NInputNumber
        v-model:value="localConfig[props.cname].padding"
        class="setting__item-element setting__input-number"
        :step="0.1"
        :min="props.paddingRange[0]"
        :max="props.paddingRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('width')"
      :label="$t('common.width')"
    >
      <NSlider
        v-model:value="localConfig[props.cname].width"
        :step="1"
        :min="props.widthRange[0]"
        :max="props.widthRange[1]"
      />
      <NInputNumber
        v-model:value="localConfig[props.cname].width"
        class="setting__item-element setting__input-number"
        :step="1"
        :min="props.widthRange[0]"
        :max="props.widthRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('height')"
      :label="$t('common.height')"
    >
      <NSlider
        v-model:value="localConfig[props.cname].height"
        :step="1"
        :min="props.heightRange[0]"
        :max="props.heightRange[1]"
      />
      <NInputNumber
        v-model:value="localConfig[props.cname].height"
        class="setting__item-element setting__input-number"
        :step="1"
        :min="props.heightRange[0]"
        :max="props.heightRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('borderRadius')"
      :label="$t('common.borderRadius')"
    >
      <NSlider
        v-model:value="localConfig[props.cname].borderRadius"
        :step="0.1"
        :min="props.borderRadiusRange[0]"
        :max="props.borderRadiusRange[1]"
      />
      <NInputNumber
        v-model:value="localConfig[props.cname].borderRadius"
        class="setting__item-element setting__input-number"
        :step="0.1"
        :min="props.borderRadiusRange[0]"
        :max="props.borderRadiusRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('fontFamily')"
      :label="$t('common.font')"
    >
      <NSelect
        v-model:value="localConfig[props.cname].fontFamily"
        :options="availableFontOptions"
        :render-label="fontSelectRenderLabel"
      />
      <NInputNumber
        v-model:value="localConfig[props.cname].fontSize"
        class="setting__item-element setting__input-number"
        :step="1"
        :min="12"
        :max="200"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('letterSpacing')"
      :label="$t('common.letterSpacing')"
    >
      <NSlider
        v-model:value="localConfig[props.cname].letterSpacing"
        :step="0.1"
        :min="0"
        :max="50"
      />
      <NInputNumber
        v-model:value="localConfig[props.cname].letterSpacing"
        class="setting__item-element setting__input-number"
        :step="0.1"
        :min="0"
        :max="50"
      />
    </NFormItem>

    <slot name="size" />

    <!-- color -->
    <div class="color-form__wrap">
      <NFormItem
        v-if="isRenderField('primaryColor')"
        :label="$t('common.primaryColor')"
      >
        <CustomColorPicker v-model:value="localConfig[props.cname].primaryColor[localState.currAppearanceCode]" />
        <Tips :content="$t('general.primaryColorTips')" />
      </NFormItem>

      <NFormItem
        v-if="isRenderField('fontColor')"
        :label="$t('common.fontColor')"
      >
        <CustomColorPicker v-model:value="localConfig[props.cname].fontColor[localState.currAppearanceCode]" />
      </NFormItem>

      <NFormItem
        v-if="isRenderField('fontActiveColor')"
        :label="$t('common.fontActiveColor')"
      >
        <CustomColorPicker v-model:value="localConfig[props.cname].fontActiveColor[localState.currAppearanceCode]" />
      </NFormItem>

      <NFormItem
        v-if="isRenderField('backgroundColor')"
        :label="$t('common.backgroundColor')"
      >
        <CustomColorPicker v-model:value="localConfig[props.cname].backgroundColor[localState.currAppearanceCode]" />
      </NFormItem>

      <NFormItem
        v-if="isRenderField('backgroundActiveColor')"
        :label="$t('common.backgroundActiveColor')"
      >
        <CustomColorPicker v-model:value="localConfig[props.cname].backgroundActiveColor[localState.currAppearanceCode]" />
      </NFormItem>

      <NFormItem
        v-if="isRenderField('shadowColor')"
        :label="$t('common.shadow')"
      >
        <NSwitch v-model:value="localConfig[props.cname].isShadowEnabled" />
        <CustomColorPicker
          v-if="isRenderField('isShadowEnabled')"
          v-model:value="localConfig[props.cname].shadowColor[localState.currAppearanceCode]"
          class="setting__row-element"
        />
      </NFormItem>

      <NFormItem
        v-if="isRenderField('borderColor')"
        :label="$t('common.border')"
      >
        <NSwitch v-model:value="localConfig[props.cname].isBorderEnabled" />
        <CustomColorPicker
          v-if="isRenderField('isBorderEnabled')"
          v-model:value="localConfig[props.cname].borderColor[localState.currAppearanceCode]"
          class="setting__row-element"
        />
        <NInputNumber
          v-if="isRenderField('borderWidth')"
          v-model:value="localConfig[props.cname].borderWidth"
          class="setting__item-element setting__input-number"
          :step="1"
          :min="1"
          :max="10"
        />
      </NFormItem>
    </div>

    <slot name="color" />

    <slot name="footer" />
  </NForm>
</template>

<style>
.n-form-item {
  margin: 15px 0;
}

.n-base-select-option__content {
  width: 100% !important;
}

.color-form__wrap {
  display: flex;
  flex-wrap: wrap;
}
</style>
