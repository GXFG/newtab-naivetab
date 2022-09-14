<template>
  <NCard id="popup" :title="`${$t('common.add')}${$t('setting.bookmark')}`">
    <NForm label-placement="left" :label-width="55" require-mark-placement="left" :model="state">
      <NFormItem :label="$t('bookmark.urlLabel')" path="url" :rule="{ required: true }">
        <NInput v-model:value="state.url" :placeholder="$t('bookmark.urlPlaceholder')" clearable autofocus />
      </NFormItem>

      <NFormItem :label="$t('bookmark.nameLabel')">
        <NInput v-model:value="state.name" :placeholder="getDefaultBookmarkNameFromUrl(state.url)" clearable />
      </NFormItem>

      <NFormItem :label="$t('bookmark.keyLabel')" path="key" :rule="{ required: true }">
        <div class="popup__keyboard">
          <div v-for="rowList in keyboardRowKeyList" :key="rowList" class="keyboard__row">
            <div v-for="key in rowList" :key="key" class="row__item" @click="selectKey(key)">
              <div v-if="key === state.key" class="item__current">
                <ic:outline-check-circle />
              </div>
              <p class="item__key">
                {{ `${key.toUpperCase()}` }}
              </p>
              <div class="item__img">
                <img
                  v-if="getBookmarkConfigUrl(key)"
                  class="img__main"
                  :src="getFaviconFromUrl(getBookmarkConfigUrl(key))"
                  :ondragstart="() => false"
                >
              </div>
            </div>
          </div>
        </div>
      </NFormItem>
    </NForm>

    <div class="popup__footer">
      <NButton class="footer__btn" type="primary" :disabled="isCommitBtnDisabled" :loading="state.isCommitLoading" @click="onCommit()">
        {{ $t('common.confirm') }}
      </NButton>
    </div>
  </NCard>
</template>

<script setup lang="ts">
import { useStorageLocal } from '@/composables/useStorageLocal'
import {
  localConfig,
  customPrimaryColor,
  getStyleConst,
  keyboardRowKeyList,
  getDefaultBookmarkNameFromUrl,
  getFaviconFromUrl,
  getBookmarkConfigUrl,
} from '@/logic'

const state = reactive({
  url: '',
  name: '',
  key: '',
  isCommitLoading: false,
})

const getCurrentTabUrl = () => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const currTab = tabs[0]
    state.url = currTab.url || ''
  })
}

onMounted(() => {
  getCurrentTabUrl()
})

const selectKey = (key: string) => {
  state.key = key
}

const isCommitBtnDisabled = computed(() => state.url.length === 0 || state.key.length === 0)

const bookmarkPendingData = useStorageLocal('data-bookmark-pending', {
  isPending: false,
})

const onCommit = () => {
  state.isCommitLoading = true
  bookmarkPendingData.value.isPending = true
  localConfig.bookmark.keymap[state.key] = {
    url: state.url,
    name: state.name,
  }
  setTimeout(() => {
    state.isCommitLoading = false
    window.$message.success(`${window.$t('common.add')}${window.$t('common.success')}`)
  }, 1200)
}

const popupMainWidth = localConfig.bookmark.isNumberEnabled ? '608px' : '570px'
const popupKeyboardBorder = getStyleConst('popupKeyboardBorder')
const popupKeyboardHoverBg = getStyleConst('popupKeyboardHoverBg')
const popupKeyboardActiveBg = getStyleConst('popupKeyboardActiveBg')
</script>

<style scoped>
#popup {
  padding-right: 10px;
  width: v-bind(popupMainWidth);
  border-radius: 0 !important;

  .popup__keyboard {
    .keyboard__row {
      display: flex;
      align-items: center;

      &:nth-child(2) {
        margin-left: 18px;
      }

      &:nth-child(3) {
        margin-left: 36px;
      }

      &:nth-child(4) {
        margin-left: 54px;
      }

      .row__item {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        position: relative;
        margin: 1px;
        padding: 2px;
        width: 36px;
        height: 36px;
        border-radius: 3px;
        border: 1px solid v-bind(popupKeyboardBorder);
        cursor: pointer;
        user-select: none;

        &:hover {
          background-color: v-bind(popupKeyboardHoverBg);
        }

        .item__current {
          display: flex;
          justify-content: center;
          align-items: center;
          position: absolute;
          top: 0;
          left: 0;
          width: 36px;
          height: 36px;
          background-color: v-bind(popupKeyboardActiveBg);
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
          width: 16px;

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
      min-width: 120px;

      .icon__wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 16px;
      }
    }
  }
}
</style>
