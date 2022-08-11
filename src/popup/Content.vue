<template>
  <NCard id="popup" :title="`${$t('common.add')}${$t('setting.bookmark')}`">
    <NForm label-placement="left" :label-width="50" require-mark-placement="left" :model="state">
      <NFormItem :label="$t('bookmark.urlLabel')">
        <NInput v-model:value="state.url" :placeholder="$t('bookmark.urlPlaceholder')" />
      </NFormItem>
      <NFormItem :label="$t('bookmark.nameLabel')">
        <NInput v-model:value="state.name" :placeholder="getDefaultBookmarkName(state.url)" />
      </NFormItem>
      <NFormItem
        :label="$t('bookmark.keyLabel')"
        path="key"
        :rule="{
          required: true,
          trigger: ['input', 'blur'],
        }"
      >
        <div class="popup__keyboard">
          <div v-for="row in keyboardRowList" :key="row" class="keyboard__row">
            <div v-for="item in row" :key="item.key" class="row__item" @click="selectKey(item.key)">
              <div v-if="item.key === state.key" class="item__current">
                <ic:outline-check-circle />
              </div>
              <p class="item__key">
                {{ `${item.key.toUpperCase()}` }}
              </p>
              <div class="item__img">
                <img v-if="item.url" class="img__main" :src="getDomainIcon(item.url)" :ondragstart="() => false">
              </div>
            </div>
          </div>
        </div>
      </NFormItem>
    </NForm>
    <div class="popup__footer">
      <NButton class="footer__btn" type="primary" :disabled="state.key.length === 0" @click="addConfig()">
        <template #icon>
          <div class="icon__wrap">
            <ic:outline-check-circle />
          </div>
        </template>
        {{ $t('common.confirm') }}
      </NButton>
    </div>
  </NCard>
</template>
<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { customPrimaryColor, localConfig, keyboardRowList, getDefaultBookmarkName, getDomainIcon } from '@/logic'

window.$message = useMessage()

const state = reactive({
  url: '',
  name: '',
  key: '',
})

onMounted(() => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const currTab = tabs[0]
    state.url = currTab.url || ''
  })
})

const selectKey = (key: string) => {
  state.key = key
}

const addConfig = () => {
  localConfig.bookmark.keymap[state.key] = {
    url: state.url,
    name: state.name,
  }
  // Todo miss config
  setTimeout(() => {
    window.$message.success(`${window.$t('common.add')}${window.$t('common.success')}`)
  }, 500)
}
</script>

<style scoped>
#popup {
  width: 515px;
  padding-right: 10px;
  border-radius: 0 !important;
  .popup__keyboard {
    .keyboard__row {
      display: flex;
      align-items: center;
      &:nth-child(2) {
        margin-left: 16px;
      }
      &:nth-child(3) {
        margin-left: 32px;
      }
      &:nth-child(4) {
        margin-left: 48px;
      }
      .row__item {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        position: relative;
        margin: 1px;
        padding: 1px;
        width: 32px;
        height: 32px;
        border: 1px solid rgb(224, 224, 230);
        border-radius: 3px;
        cursor: pointer;
        user-select: none;
        &:hover {
          opacity: 0.7;
          background-color: rgba(0, 0, 0, 0.7);
        }
        .item__current {
          display: flex;
          justify-content: center;
          align-items: center;
          position: absolute;
          top: 0;
          left: 0;
          width: 32px;
          height: 32px;
          background-color: rgba(0, 0, 0, 0.7);
          color: v-bind(customPrimaryColor);
          font-size: 18px;
          border-radius: 3px;
        }
        .item__key {
          font-size: 12px;
          line-height: 1;
        }
        .item__img {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 15px;
          .img__main {
            width: 100%;
            height: 100%;
          }
        }
      }
    }
  }
  .popup__footer {
    display: flex;
    justify-content: center;
    margin-top: 10px;
    .footer__btn {
      .icon__wrap {
        font-size: 16px;
      }
    }
  }
}
</style>
