<script setup lang="ts">
import { useStorageLocal } from '@/composables/useStorageLocal'
import {
  KEYBOARD_CODE_TO_DEFAULT_CONFIG,
  localConfig,
  customPrimaryColor,
  getStyleConst,
  currKeyboardConfig,
  getDefaultBookmarkNameFromUrl,
  getFaviconFromUrl,
  getBookmarkConfigUrl,
} from '@/logic'

const state = reactive({
  url: '',
  name: '',
  keyCode: '',
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
  state.keyCode = key
}

const isCommitBtnDisabled = computed(() => state.url.length === 0 || state.keyCode.length === 0)

const bookmarkPendingData = useStorageLocal('data-bookmark-pending', {
  isPending: false,
})

const onCommit = () => {
  state.isCommitLoading = true
  bookmarkPendingData.value.isPending = true
  localConfig.bookmark.keymap[state.keyCode] = {
    url: state.url,
    name: state.name,
  }
  setTimeout(() => {
    state.isCommitLoading = false
    window.$message.success(`${window.$t('common.add')}${window.$t('common.success')}`)
  }, 1200)
}

// const popupMainWidth = ['80', '84', '87'].includes(`${localConfig.bookmark.keyboardType}`) ? '740px' : '690px'

const popupKeyboardBorder = getStyleConst('popupKeyboardBorder')
const popupKeyboardHoverBg = getStyleConst('popupKeyboardHoverBg')
const popupKeyboardActiveBg = getStyleConst('popupKeyboardActiveBg')

const KEYCAP_BASE_SIZE = 36

const getCustomKeycapWidth = (code: string) => {
  let value = KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].size
  const customSize = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].size
  if (customSize) {
    value = customSize
  }
  const width = KEYCAP_BASE_SIZE * value
  return width
}

const getCustomKeycapMargin = (code: string, type: 'marginLeft' | 'marginRight') => {
  const value = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code][type]
  if (value) {
    return KEYCAP_BASE_SIZE * value
  }
  return 0
}

const getKeycapWrapStyle = (code: string) => {
  let style = ''
  const width = getCustomKeycapWidth(code)
  style += `width: ${width}px; `
  const marginLeft = getCustomKeycapMargin(code, 'marginLeft')
  if (marginLeft) {
    style += `margin-left: ${marginLeft}px; `
  }
  const marginRight = getCustomKeycapMargin(code, 'marginRight')
  if (marginRight) {
    style += `margin-right: ${marginRight}px; `
  }
  const marginBottom = currKeyboardConfig.value.custom[code] && currKeyboardConfig.value.custom[code].marginBottom
  if (marginBottom) {
    style += `margin-bottom: ${KEYCAP_BASE_SIZE * marginBottom}px; `
  }
  return style
}

const getContainerWidth = () => {
  let totalWidth = 120
  for (const code of currKeyboardConfig.value.list[0]) {
    totalWidth += getCustomKeycapWidth(code)
    totalWidth += getCustomKeycapMargin(code, 'marginLeft')
    totalWidth += getCustomKeycapMargin(code, 'marginRight')
  }
  return totalWidth
}

const popupMainWidth = `${getContainerWidth()}px`
</script>

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
          <div v-for="(rowData, rowIndex) of currKeyboardConfig.list" :key="rowIndex" class="keyboard__row">
            <div v-for="code of rowData" :key="code" class="row__keycap-wrap" :style="getKeycapWrapStyle(code)">
              <div class="row__keycap" @click="selectKey(code)">
                <div v-if="code === state.keyCode" class="keycap__select">
                  <ic:outline-check-circle />
                </div>
                <p class="keycap__label">
                  {{ KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].label }}
                </p>
                <div class="keycap__img">
                  <img
                    v-if="getBookmarkConfigUrl(code)"
                    class="img__main"
                    :src="getFaviconFromUrl(getBookmarkConfigUrl(code))"
                    :ondragstart="() => false"
                  >
                </div>
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

<style scoped>
#popup {
  padding-right: 10px;
  width: v-bind(popupMainWidth);
  border-radius: 0 !important;

  .popup__keyboard {
    .keyboard__row {
      display: flex;
      .row__keycap-wrap {
        padding: 1px;
        height: v-bind(`${KEYCAP_BASE_SIZE}px`);
        .row__keycap {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          position: relative;
          padding: 2px;
          width: 100%;
          height: 100%;
          border-radius: 3px;
          border: 1px solid v-bind(popupKeyboardBorder);
          cursor: pointer;
          user-select: none;

          &:hover {
            background-color: v-bind(popupKeyboardHoverBg);
          }

          .keycap__select {
            display: flex;
            justify-content: center;
            align-items: center;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: v-bind(popupKeyboardActiveBg);
            color: v-bind(customPrimaryColor);
            font-size: 18px;
            border-radius: 3px;
          }

          .keycap__label {
            font-size: 12px;
            line-height: 1;
          }

          .keycap__img {
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
