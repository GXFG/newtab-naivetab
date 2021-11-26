<template>
  <ComponentLayout field="bookmarks" />

  <ElementConfig field="bookmarks"></ElementConfig>

  <NDivider title-placement="left">
    {{ $t('bookmarks.bookmarksDividerConfig') }}
  </NDivider>

  <div class="modal__bookmarks">
    <NSpace vertical>
      <NInputGroup class="bookmarks__label">
        <p class="label__text">
          {{ $t('bookmarks.urlLabel') }}
        </p>
        <p class="label__text">
          {{ $t('bookmarks.nameLabel') }}
        </p>
      </NInputGroup>
      <NInputGroup v-for="key of KEYBOARD_KEY" :key="key" class="bookmarks__item">
        <NInputGroupLabel class="item__label">
          {{ `${key.toUpperCase()}` }}
        </NInputGroupLabel>
        <template v-if="globalState.setting.bookmarks.keymap[key]">
          <NInput
            v-for="field of ['url', 'name']"
            :key="field"
            v-model:value="globalState.setting.bookmarks.keymap[key][field as 'url' | 'name']"
            class="input__main"
            type="text"
            clearable
            :placeholder="$t(`bookmarks.${field}Placeholder`)"
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
</template>

<script setup lang="ts">
import { NDivider, NButton, NSpace, NInputGroup, NInputGroupLabel, NInput } from 'naive-ui'
import { KEYBOARD_KEY, globalState } from '@/logic'

const onAddKey = (key: string) => {
  globalState.setting.bookmarks.keymap[key] = {
    url: '',
    name: '',
  }
}

const onDeleteKey = (key: string) => {
  delete globalState.setting.bookmarks.keymap[key]
}

</script>

<style>
.modal__bookmarks {
  .bookmarks__label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .label__text {
      font-size: 14px;
      opacity: 0.6;
      &:nth-of-type(1) {
        margin-left: 12%;
      }
      &:nth-of-type(2) {
        margin-right: 26%;
      }
    }
  }
  .bookmarks__item {
    .item__label {
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
