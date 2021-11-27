<template>
  <ComponentLayout field="bookmark">
    <div class="modal__bookmark">
      <NSpace vertical>
        <NInputGroup class="bookmark__label">
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
            <NInput
              v-for="field of ['url', 'name']"
              :key="field"
              v-model:value="globalState.setting.bookmark.keymap[key][field as 'url' | 'name']"
              class="input__main"
              type="text"
              clearable
              :placeholder="$t(`bookmark.${field}Placeholder`)"
            />
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
  </ComponentLayout>

  <ElementConfig field="bookmark" />
</template>

<script setup lang="ts">
import { NDivider, NButton, NSpace, NInputGroup, NInputGroupLabel, NInput } from 'naive-ui'
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
    .label__text {
      opacity: 0.6;
      &:nth-of-type(1) {
        margin-left: 12%;
      }
      &:nth-of-type(2) {
        margin-right: 26%;
      }
    }
  }
  .bookmark__item {
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
