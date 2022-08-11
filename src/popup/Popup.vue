<template>
  <NConfigProvider id="popup" :locale="nativeUILang" :theme="currTheme" :theme-overrides="themeOverrides">
    <NCard class="popup__card">
      <div v-if="state.isSuccess" class="card__result">
        <NResult status="success" size="small" :title="$t('common.success')" :description="`${$t('common.add')}${$t('common.success')}`" />
      </div>
      <div v-else>
        <NForm label-placement="left" :label-width="50">
          <NFormItem :label="$t('bookmark.urlLabel')">
            <NInput v-model:value="state.url" :placeholder="$t('bookmark.urlPlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('bookmark.nameLabel')">
            <NInput v-model:value="state.name" :placeholder="getDefaultBookmarkName(state.url)" />
          </NFormItem>
          <NFormItem :label="$t('bookmark.keyLabel')">
            <NInput v-model:value="state.key" />
          </NFormItem>
        </NForm>
        <div class="card__footer">
          <NButton class="footer__btn" type="primary" ghost @click="addConfig()">
            <template #icon>
              <div class="icon__wrap">
                <ic:outline-check-circle />
              </div>
            </template>
            {{ $t('common.confirm') }}
          </NButton>
        </div>
      </div>
    </NCard>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { nativeUILang, currTheme, themeOverrides, localConfig, keyboardCurrentModelAllKeyList, keyboardSettingRowList, getDefaultBookmarkName } from '@/logic'

const state = reactive({
  isSuccess: false,
  url: '',
  name: '',
  key: 'f',
})

onMounted(() => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const currTab = tabs[0]
    state.url = currTab.url || ''
  })
})

// Todo handle edit key

const addConfig = () => {
  localConfig.bookmark.keymap[state.key] = {
    url: state.url,
    name: state.name,
  }
  // Todo miss config
  state.isSuccess = true
}
</script>

<style>
#popup {
  width: 450px;
  .popup__card {
    padding-top: 20px;
    padding-right: 10px;
    border-radius: 0 !important;
    .card__result {
      padding-bottom: 25px;
    }
    .card__footer {
      display: flex;
      justify-content: center;
      margin-top: 10px;
      .footer__btn {
        margin: 0 10px;
        .icon__wrap {
          font-size: 16px;
        }
      }
    }
  }
}
</style>
