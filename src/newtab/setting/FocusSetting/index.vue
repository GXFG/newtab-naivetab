<script setup lang="ts">
import { Icon } from '@iconify/vue'
import SettingPaneTitle from '~/newtab/setting/SettingPaneTitle.vue'
import Tips from '@/components/Tips.vue'
import { localConfig } from '@/logic/store'
import { widgetsList } from '@/newtab/widgets/registry'
</script>

<template>
  <SettingPaneTitle :title="$t('setting.focusMode')" />

  <NForm
    label-placement="left"
    :label-width="120"
    :show-feedback="false"
  >
    <NFormItem :label="$t('rightMenu.focusMode')">
      <NSwitch
        v-model:value="localConfig.general.isFocusMode"
        size="small"
      />
      <Tips :content="$t('general.focusModeTips')" />
    </NFormItem>

    <div class="setting__form_wrap">
      <div class="minimal__grid">
        <div
          v-for="meta in widgetsList"
          :key="meta.code"
          class="minimal__item"
        >
          <div class="minimal__left">
            <Icon
              class="minimal__icon"
              :icon="meta.iconName"
              :style="{ fontSize: meta.iconSize + 'px' }"
            />
            <span class="minimal__label">{{ $t(meta.widgetLabel) }}</span>
          </div>
          <NSwitch
            v-model:value="localConfig.general.focusVisibleWidgetMap[meta.code]"
            size="small"
          />
        </div>
      </div>
    </div>
  </NForm>
</template>

<style>
.minimal__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  width: 100%;
  .minimal__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-radius: 7px;
    background-color: rgba(127, 140, 141, 0.08);

    .minimal__left {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;

      .minimal__icon {
        width: 25%;
      }

      .minimal__label {
        font-size: 13px;
      }
    }
  }
}
</style>
