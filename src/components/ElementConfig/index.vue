<template>
  <NForm ref="formRef" label-placement="left" :label-width="100">
    <NDivider title-placement="left">
      {{ $t('common.style') }}
    </NDivider>

    <NFormItem :label="$t('common.font')">
      <NInput v-model:value="globalState.setting[props.field].style.fontFamily" placeholder=" "></NInput>
    </NFormItem>

    <NFormItem :label="$t('common.fontSize')">
      <NSlider
        v-model:value="globalState.setting[props.field].style.fontSize"
        :step="1"
        :max="200"
      />
      <NInputNumber
        v-model:value="globalState.setting[props.field].style.fontSize"
        class="layout__input_number"
        :step="1"
      ></NInputNumber>
    </NFormItem>

    <NFormItem :label="$t('common.fontColor')">
      <div class="color__picker">
        <label class="picker__label">{{ $t('common.light') }}</label>
        <NColorPicker
          v-model:value="globalState.setting[props.field].style.fontColor[0]"
          :show-alpha="false"
        />
      </div>
      <div class="color__picker">
        <label class="picker__label">{{ $t('common.dark') }}</label>
        <NColorPicker
          v-model:value="globalState.setting[props.field].style.fontColor[1]"
          :show-alpha="false"
        />
      </div>
    </NFormItem>

    <NFormItem
      v-if="globalState.setting[props.field].style.backgroundColor"
      :label="$t('common.backgroundColor')"
    >
      <div class="color__picker">
        <label class="picker__label">{{ $t('common.light') }}</label>
        <NColorPicker
          v-model:value="globalState.setting[props.field].style.backgroundColor[0]"
          :show-alpha="false"
        />
      </div>
      <div class="color__picker">
        <label class="picker__label">{{ $t('common.dark') }}</label>
        <NColorPicker
          v-model:value="globalState.setting[props.field].style.backgroundColor[1]"
          :show-alpha="false"
        />
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
  .picker__label {
    flex: 0 0 auto;
    padding-right: 5px;
    font-size: 14px;
    opacity: 0.6;
  }
}

.layout__input_number {
  margin-left: 10px;
  width: 120px;
}
</style>
