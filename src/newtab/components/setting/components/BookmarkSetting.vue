<template>
  <ComponentLayout name="bookmarks" />
  <NDivider title-placement="left">
    {{ $t('bookmarks.bookmarksDividerConfig') }}
  </NDivider>

  <ul class="modal__bookmarks">
    <li class="bookmarks__label">
      <p class="label__text">
        {{ $t('bookmarks.urlLabel') }}
      </p>
      <p class="label__text">
        {{ $t('bookmarks.nameLabel') }}
      </p>
    </li>
    <li v-for="key of KEYBOARD_KEY" :key="key" class="bookmarks__item">
      <div class="item__key">
        <span>{{ `${key.toUpperCase()}` }}</span>
      </div>
      <!-- 存在配置的书签 -->
      <div v-if="globalState.setting.bookmarks.keymap[key]" class="item__content">
        <div v-for="field of ['url', 'name']" :key="field" class="content__input">
          <NInput
            v-model:value="globalState.setting.bookmarks.keymap[key][field as 'url' | 'name']"
            class="input__main"
            type="text"
            clearable
            :placeholder="$t(`bookmarks.${field}Placeholder`)"
          >
          </NInput>
        </div>
        <NButton class="content__icon" text @click="onDeleteKey(key)">
          <ri:delete-bin-6-line class="item__icon" />
        </NButton>
      </div>
      <!-- 创建 -->
      <div v-else class="item__content">
        <NButton class="content__icon" text @click="onAddKey(key)">
          <zondicons:add-solid class="item__icon" />
        </NButton>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { NDivider, NButton, NInput } from 'naive-ui'
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
    margin-bottom: -10px;
    .label__text {
      &:nth-of-type(1) {
        margin-left: 30%;
      }
      &:nth-of-type(2) {
        margin-right: 18%;
      }
    }
  }
  .bookmarks__item {
    display: flex;
    align-items: center;
    margin: 13px 0;
    background-color: var(--bg-operation-item);
    border-radius: 3px;
    .item__key {
      flex: 0 0 auto;
      width: 30px;
      height: 41px;
      font-size: 16px;
      line-height: 41px;
      text-align: center;
      background-color: var(--bg-operation-key);
      border-top-left-radius: 3px;
      border-bottom-left-radius: 3px;
    }
    .item__content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 10px;
      .content__icon {
        cursor: pointer;
        .item__icon {
          font-size: 16px;
        }
      }
      .content__input {
        display: flex;
        align-items: center;
        margin-right: 10px;
        .input__label {
          width: 70px;
        }
        &:nth-of-type(1) {
          flex: 1;
        }
        &:nth-of-type(2) {
          width: 25%;
        }
      }
    }
  }
}
</style>
