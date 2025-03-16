<script setup lang="ts">
import { URL_DAYJS_FORMAT } from '@/logic/const'
import { localConfig, localState } from '@/logic/store'
import Tips from '@/newtab/components/form/Tips.vue'
import BaseComponentCardTitle from '@/newtab/components/form/BaseComponentCardTitle.vue'
import BaseComponentSetting from '@/newtab/components/form/BaseComponentSetting.vue'
import CustomColorPicker from '@/newtab/components/form/CustomColorPicker.vue'
</script>

<template>
  <BaseComponentCardTitle :title="$t('setting.yearProgress')" />

  <BaseComponentSetting
    cname="yearProgress"
    :width-range="[100, 1000]"
    :height-range="[100, 1000]"
    :border-radius-range="[0, 40]"
  >
    <template #header>
    </template>

    <template #footer>
      <p class="setting__label">
        {{ `${$t('common.left')}-${$t('common.text')}${$t('common.config')}` }}
      </p>
      <NFormItem :label="`${$t('yearProgress.isRealtime')}`">
        <NSwitch
          v-model:value="localConfig.yearProgress.isRealtime"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="`${$t('yearProgress.percentage')}`">
        <div class="setting__item_wrap">
          <div class="item__box">
            <NSwitch
              v-model:value="localConfig.yearProgress.isPercentageEnabled"
              size="small"
            />
          </div>
          <div class="item__box">
            <NInputNumber
              v-model:value="localConfig.yearProgress.percentageDecimal"
              class="setting__input-number--unit"
              size="small"
              :step="1"
              :min="0"
              :max="6"
            >
              <template #prefix>
                {{ `${$t('yearProgress.decimal')}` }}
              </template>
            </NInputNumber>
          </div>
        </div>
      </NFormItem>

      <NFormItem :label="`${$t('setting.date')}`">
        <NSwitch
          v-model:value="localConfig.yearProgress.isDateEnabled"
          size="small"
        />
        <template v-if="localConfig.yearProgress.isDateEnabled">
          <NInput
            v-model:value="localConfig.yearProgress.format"
            class="setting__item-ml"
            size="small"
          />
          <Tips
            link
            :content="URL_DAYJS_FORMAT"
          />
        </template>
      </NFormItem>

      <NFormItem :label="`${$t('common.lineHeight')}`">
        <NSlider
          v-model:value="localConfig.yearProgress.textLineHeight"
          :step="0.1"
          :min="0"
          :max="5"
          :tooltip="false"
        />
        <NInputNumber
          v-model:value="localConfig.yearProgress.textLineHeight"
          class="setting__item-element setting__input-number"
          size="small"
          :step="0.1"
          :min="0"
          :max="5"
        />
      </NFormItem>
      <NFormItem
        :label="`${$t('common.active')}${$t('common.fontColor')}`"
        class="n-form-item--color"
      >
        <CustomColorPicker v-model:value="localConfig.yearProgress.textActiveColor[localState.currAppearanceCode]" />
      </NFormItem>

      <p class="setting__label">
        {{ `${$t('common.right')}-${$t('yearProgress.block')}${$t('common.config')}` }}
      </p>
      <NFormItem :label="`${$t('common.margin')}`">
        <NSlider
          v-model:value="localConfig.yearProgress.blockMargin"
          :step="0.1"
          :min="0"
          :max="10"
          :tooltip="false"
        />
        <NInputNumber
          v-model:value="localConfig.yearProgress.blockMargin"
          class="setting__item-element setting__input-number"
          size="small"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </NFormItem>
      <NFormItem :label="`${$t('common.size')}`">
        <NSlider
          v-model:value="localConfig.yearProgress.blockSize"
          :step="0.1"
          :min="2"
          :max="10"
          :tooltip="false"
        />
        <NInputNumber
          v-model:value="localConfig.yearProgress.blockSize"
          class="setting__item-element setting__input-number"
          size="small"
          :step="0.1"
          :min="2"
          :max="10"
        />
      </NFormItem>
      <NFormItem :label="`${$t('common.borderRadius')}`">
        <NSlider
          v-model:value="localConfig.yearProgress.blockRadius"
          :step="0.1"
          :min="0"
          :max="10"
          :tooltip="false"
        />
        <NInputNumber
          v-model:value="localConfig.yearProgress.blockRadius"
          class="setting__item-element setting__input-number"
          size="small"
          :step="0.1"
          :min="0"
          :max="10"
        />
      </NFormItem>
      <div class="setting__form_wrap">
        <NFormItem
          :label="`${$t('common.default')}${$t('common.backgroundColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.yearProgress.blockDefaultColor[localState.currAppearanceCode]" />
        </NFormItem>
        <NFormItem
          :label="`${$t('common.active')}${$t('common.backgroundColor')}`"
          class="n-form-item--color"
        >
          <CustomColorPicker v-model:value="localConfig.yearProgress.blockActiveColor[localState.currAppearanceCode]" />
        </NFormItem>
      </div>
    </template>
  </BaseComponentSetting>
</template>
