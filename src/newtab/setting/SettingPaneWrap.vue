<script setup lang="ts">
import { localConfig, localState, availableFontOptions, fontSelectRenderLabel } from '@/logic/store'
import CustomColorPicker from '~/components/CustomColorPicker.vue'
import Tips from '@/components/Tips.vue'

const props = defineProps({
  widgetCode: {
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
  return field in localConfig[props.widgetCode]
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
        v-model:value="localConfig[props.widgetCode].margin"
        :step="0.1"
        :min="props.marginRange[0]"
        :max="props.marginRange[1]"
        :tooltip="false"
      />
      <NInputNumber
        v-model:value="localConfig[props.widgetCode].margin"
        class="setting__item-ele setting__input-number"
        size="small"
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
        v-model:value="localConfig[props.widgetCode].padding"
        :step="0.1"
        :min="props.paddingRange[0]"
        :max="props.paddingRange[1]"
        :tooltip="false"
      />
      <NInputNumber
        v-model:value="localConfig[props.widgetCode].padding"
        class="setting__item-ele setting__input-number"
        size="small"
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
        v-model:value="localConfig[props.widgetCode].width"
        :step="1"
        :min="props.widthRange[0]"
        :max="props.widthRange[1]"
        :tooltip="false"
      />
      <NInputNumber
        v-model:value="localConfig[props.widgetCode].width"
        class="setting__item-ele setting__input-number"
        size="small"
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
        v-model:value="localConfig[props.widgetCode].height"
        :step="1"
        :min="props.heightRange[0]"
        :max="props.heightRange[1]"
        :tooltip="false"
      />
      <NInputNumber
        v-model:value="localConfig[props.widgetCode].height"
        class="setting__item-ele setting__input-number"
        size="small"
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
        v-model:value="localConfig[props.widgetCode].borderRadius"
        :step="0.1"
        :min="props.borderRadiusRange[0]"
        :max="props.borderRadiusRange[1]"
        :tooltip="false"
      />
      <NInputNumber
        v-model:value="localConfig[props.widgetCode].borderRadius"
        class="setting__item-ele setting__input-number"
        size="small"
        :step="0.1"
        :min="props.borderRadiusRange[0]"
        :max="props.borderRadiusRange[1]"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('backgroundBlur')"
      :label="$t('common.blur')"
    >
      <div class="setting__item_wrap">
        <div
          class="item__box"
          style="width: 100%"
        >
          <NSlider
            v-model:value="localConfig[props.widgetCode].backgroundBlur"
            :step="0.1"
            :min="0"
            :max="30"
            :tooltip="false"
          />
          <NInputNumber
            v-model:value="localConfig[props.widgetCode].backgroundBlur"
            class="setting__item-ele setting__input-number"
            size="small"
            :step="0.1"
            :min="0"
            :max="30"
          />
        </div>
      </div>
    </NFormItem>

    <NFormItem
      v-if="isRenderField('fontFamily')"
      :label="$t('common.font')"
    >
      <NSelect
        v-model:value="localConfig[props.widgetCode].fontFamily"
        :options="availableFontOptions"
        :render-label="fontSelectRenderLabel"
        size="small"
      />
      <CustomColorPicker
        v-model:value="localConfig[props.widgetCode].fontColor[localState.currAppearanceCode]"
        class="setting__item-ele"
      />
      <NInputNumber
        v-model:value="localConfig[props.widgetCode].fontSize"
        class="setting__item-ele setting__input-number"
        size="small"
        :step="1"
        :min="5"
        :max="200"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('letterSpacing')"
      :label="$t('common.letterSpacing')"
    >
      <NSlider
        v-model:value="localConfig[props.widgetCode].letterSpacing"
        :step="0.1"
        :min="0"
        :max="50"
        :tooltip="false"
      />
      <NInputNumber
        v-model:value="localConfig[props.widgetCode].letterSpacing"
        class="setting__item-ele setting__input-number"
        size="small"
        :step="0.1"
        :min="0"
        :max="50"
      />
    </NFormItem>

    <slot name="size" />

    <!-- color -->
    <NFormItem
      v-if="isRenderField('primaryColor')"
      :label="$t('common.primaryColor')"
      class="n-form-item--color"
    >
      <CustomColorPicker v-model:value="localConfig[props.widgetCode].primaryColor[localState.currAppearanceCode]" />
      <Tips :content="$t('general.primaryColorTips')" />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('backgroundColor')"
      :label="$t('common.backgroundColor')"
      class="n-form-item--color"
    >
      <CustomColorPicker v-model:value="localConfig[props.widgetCode].backgroundColor[localState.currAppearanceCode]" />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('borderColor')"
      :label="$t('common.border')"
      class="n-form-item--color"
    >
      <NSwitch
        v-model:value="localConfig[props.widgetCode].isBorderEnabled"
        size="small"
      />
      <CustomColorPicker
        v-if="isRenderField('isBorderEnabled')"
        v-model:value="localConfig[props.widgetCode].borderColor[localState.currAppearanceCode]"
        class="setting__item-ele"
      />
      <NInputNumber
        v-if="isRenderField('borderWidth')"
        v-model:value="localConfig[props.widgetCode].borderWidth"
        class="setting__item-ele setting__input-number"
        size="small"
        :step="1"
        :min="1"
        :max="10"
      />
    </NFormItem>

    <NFormItem
      v-if="isRenderField('shadowColor')"
      :label="$t('common.shadow')"
      class="n-form-item--color"
    >
      <NSwitch
        v-model:value="localConfig[props.widgetCode].isShadowEnabled"
        size="small"
      />
      <CustomColorPicker
        v-if="isRenderField('isShadowEnabled')"
        v-model:value="localConfig[props.widgetCode].shadowColor[localState.currAppearanceCode]"
        class="setting__item-ele"
      />
    </NFormItem>

    <slot name="color" />

    <slot name="footer" />
  </NForm>
</template>
