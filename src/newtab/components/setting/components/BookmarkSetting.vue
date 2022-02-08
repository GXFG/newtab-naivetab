<template>
  <NCollapse class="setting__content" display-directive="show" :default-expanded-names="['bookmarkKeyboard']">
    <!-- bookmarkKeyboard -->
    <NCollapseItem :title="$t('setting.bookmarkKeyboard')" name="bookmarkKeyboard">
      <BaseComponentSetting cname="bookmark">
        <template #header>
          <NFormItem :label="$t('bookmark.showNumberKey')">
            <NSwitch v-model:value="localState.setting.bookmark.isNumberEnabled" />
          </NFormItem>
          <NFormItem :label="$t('bookmark.showSymbolKey')">
            <NSwitch v-model:value="localState.setting.bookmark.isSymbolEnabled" />
          </NFormItem>
          <NFormItem :label="$t('bookmark.dblclickKeyToOpen')">
            <div class="setting__input-wrap">
              <div class="setting__input_item">
                <NSwitch v-model:value="localState.setting.bookmark.isDblclickOpen" />
                <Tips :content="$t('bookmark.dblclickKeyToOpenTips')" />
              </div>
              <div v-if="localState.setting.bookmark.isDblclickOpen" class="setting__input_item">
                <span class="setting__row-element">{{ $t('bookmark.intervalTime') }}</span>
                <NInputNumber v-model:value="localState.setting.bookmark.dblclickIntervalTime" class="setting__input-number--unit" :min="0" :step="1">
                  <template #suffix>
                    ms
                  </template>
                </NInputNumber>
                <Tips :content="$t('bookmark.intervalTimeTips')" />
              </div>
            </div>
          </NFormItem>
          <div class="modal__bookmark">
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
            <div v-for="rowData of keyboardSettingRowList" :key="rowData" class="bookmark__row">
              <NInputGroup v-for="key of rowData" :key="key" class="bookmark__item">
                <NInputGroupLabel class="item__key">
                  {{ `${key.toUpperCase()}` }}
                </NInputGroupLabel>
                <template v-if="localState.setting.bookmark.keymap[key]">
                  <NInput
                    key="url"
                    v-model:value="localState.setting.bookmark.keymap[key].url"
                    class="input__main"
                    type="text"
                    clearable
                    :placeholder="$t('bookmark.urlPlaceholder')"
                  />
                  <NInput
                    key="name"
                    v-model:value="localState.setting.bookmark.keymap[key].name"
                    class="input__main"
                    type="text"
                    clearable
                    :placeholder="getDefaultBookmarkName(localState.setting.bookmark.keymap[key].url)"
                  />
                  <NButton @click="onMoveKey(key, 'up')">
                    <jam:chevron-up class="item__icon" />
                  </NButton>
                  <NButton @click="onMoveKey(key, 'down')">
                    <jam:chevron-down class="item__icon" />
                  </NButton>
                  <NButton @click="onDeleteKey(key)">
                    <ri:delete-bin-6-line class="item__icon" />
                  </NButton>
                </template>
                <NButton v-else class="item__add" @click="onAddKey(key)">
                  <zondicons:add-solid class="item__icon" />
                </NButton>
              </NInputGroup>
            </div>
          </div>
        </template>
      </BaseComponentSetting>
    </NCollapseItem>
  </NCollapse>
</template>

<script setup lang="ts">
import { localState, keyboardSettingRowList, getDefaultBookmarkName } from '@/logic'

const onAddKey = (key: string) => {
  localState.setting.bookmark.keymap[key] = {
    url: '',
    name: '',
  }
}

const onDeleteKey = (key: string) => {
  delete localState.setting.bookmark.keymap[key]
}

const currKeyboardList = computed(() => keyboardSettingRowList.value.flat())

const onMoveKey = (key: string, type: 'up' | 'down') => {
  const currIndex = currKeyboardList.value.indexOf(key)
  const listLen = currKeyboardList.value.length
  if (type === 'up' && currIndex <= 0) {
    return
  } else if (type === 'down' && currIndex >= listLen - 1) {
    return
  }
  const targetIndex = type === 'up' ? currIndex - 1 : currIndex + 1
  const targetKey = currKeyboardList.value[targetIndex]
  const targetData = localState.setting.bookmark.keymap[targetKey]
  const currData: any = localState.setting.bookmark.keymap[key]
  localState.setting.bookmark.keymap[key] = targetData
  localState.setting.bookmark.keymap[targetKey] = currData
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
  .bookmark__row {
    margin-bottom: 10px;
    .bookmark__item {
      padding: 3px 0 3px 15px;
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
}
</style>
