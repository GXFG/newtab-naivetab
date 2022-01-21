<template>
  <NCollapse class="setting__content" display-directive="show" :default-expanded-names="['bookmarkKeyboard']">
    <!-- bookmarkKeyboard -->
    <NCollapseItem :title="$t('setting.bookmarkKeyboard')" name="bookmarkKeyboard">
      <BaseComponentSetting cname="bookmark">
        <template #header>
          <NFormItem :label="$t('bookmark.dblclickKeyToOpen')">
            <div class="setting__input-wrap">
              <div class="setting__input_item">
                <NSwitch v-model:value="globalState.setting.bookmark.isDblclickOpen" />
                <Tips :content="$t('bookmark.dblclickKeyToOpenTips')" />
              </div>
              <div v-if="globalState.setting.bookmark.isDblclickOpen" class="setting__input_item">
                <span class="setting__row-element">{{ $t('bookmark.intervalTime') }}</span>
                <NInputNumber v-model:value="globalState.setting.bookmark.dblclickIntervalTime" class="setting__input-number--unit" :min="0" :step="1">
                  <template #suffix>
                    ms
                  </template>
                </NInputNumber>
                <Tips :content="$t('bookmark.intervalTimeTips')" />
              </div>
            </div>
          </NFormItem>
          <div class="modal__bookmark">
            <NSpace vertical>
              <NInputGroup class="bookmark__label">
                <p class="label__text">
                  {{ $t('bookmark.keyLabel') }}
                </p>
                <p class="label__text">
                  {{ $t('bookmark.urlLabel') }}
                </p>
                <p class="label__text">
                  {{ $t('bookmark.nameLabel') }}
                </p>
              </NInputGroup>
              <NInputGroup v-for="key of KEYBOARD_KEY" :key="key" class="bookmark__item">
                <NInputGroupLabel class="item__key">
                  {{ `${key.toUpperCase()}` }}
                </NInputGroupLabel>
                <template v-if="globalState.setting.bookmark.keymap[key]">
                  <NInput v-for="field of ['url', 'name']" :key="field" v-model:value="globalState.setting.bookmark.keymap[key][field as 'url' | 'name']" class="input__main" type="text" clearable :placeholder="$t(`bookmark.${field}Placeholder`)" />
                  <NButton @click="onDeleteKey(key)">
                    <ri:delete-bin-6-line class="item__icon" />
                  </NButton>
                </template>
                <NButton v-else class="item__add" @click="onAddKey(key)">
                  <zondicons:add-solid class="item__icon" />
                </NButton>
              </NInputGroup>
            </NSpace>
          </div>
        </template>
      </BaseComponentSetting>
    </NCollapseItem>
  </NCollapse>
</template>

<script setup lang="ts">
import { KEYBOARD_KEY, globalState } from '@/logic'

const onAddKey = (key: string) => {
  globalState.setting.bookmark.keymap[key] = {
    url: '',
    name: '',
  }
}

const onDeleteKey = (key: string) => {
  delete globalState.setting.bookmark.keymap[key]
}
</script>

<style>
.modal__bookmark {
  .bookmark__label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0 0 15px;
    .label__text {
      opacity: 0.6;
      text-align: center;
      &:nth-of-type(1) {
        width: 40px;
      }
      &:nth-of-type(2) {
        flex: 1;
      }
      &:nth-of-type(3) {
        width: 33%;
      }
    }
  }
  .bookmark__item {
    padding: 0 0 0 15px;
    .item__key {
      flex: 0 0 auto;
      display: flex;
      justify-content: center;
      width: 40px;
    }
    .input__main {
      &:nth-of-type(2) {
        flex: 1;
      }
      &:nth-of-type(3) {
        width: 25%;
      }
    }
    .item__add {
      flex: 1;
    }
  }
}
</style>
