<script setup lang="ts">
import { useStorageLocal } from '@/composables/useStorageLocal'
import {
  KEYBOARD_CODE_TO_DEFAULT_CONFIG,
  KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST,
  globalState,
  localConfig,
  customPrimaryColor,
  getStyleConst,
  currKeyboardConfig,
  getAllCommandsConfig,
  openConfigShortcutsPage,
  getDefaultBookmarkNameFromUrl,
  getFaviconFromUrl,
  getBookmarkConfigUrl,
} from '@/logic'

const state = reactive({
  isBookmarkDragEnabled: true,
  isCommitLoading: false,
  currDragKeyCode: '',
  targetDragKeyCode: '',
  url: '',
  name: '',
  keyCode: '',
})

const setCurrentTabUrl = () => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const currTab = tabs[0]
    state.url = currTab.url || ''
    state.name = ''
  })
}

onMounted(() => {
  setCurrentTabUrl()
  getAllCommandsConfig()
})

const loadCurrKeyConfig = () => {
  if (state.keyCode.length === 0) {
    return
  }
  if (localConfig.bookmark.keymap[state.keyCode]) {
    state.url = localConfig.bookmark.keymap[state.keyCode].url
    state.name = localConfig.bookmark.keymap[state.keyCode].name
  } else {
    state.url = ''
    state.name = ''
  }
}

const selectKey = (key: string) => {
  state.keyCode = key
  loadCurrKeyConfig()
}

const isCommitBtnDisabled = computed(() => {
  return state.keyCode.length === 0
})

const bookmarkPendingData = useStorageLocal('data-bookmark-pending', {
  isPending: false,
})

const onCommitFuncWrap = (callback: () => void) => {
  state.isCommitLoading = true
  bookmarkPendingData.value.isPending = true // 为实现page切换前台时刷新通过pupop修改的书签
  callback()
  setTimeout(() => {
    state.isCommitLoading = false
    window.$message.success(`${window.$t('common.edit')}${window.$t('common.success')}`)
  }, 1000)
}

const onCommitConfigBookmark = () => {
  onCommitFuncWrap(() => {
    if (state.url.length === 0) {
      delete localConfig.bookmark.keymap[state.keyCode]
    } else {
      localConfig.bookmark.keymap[state.keyCode] = {
        url: state.url,
        name: state.name,
      }
    }
  })
}

const handleDragStart = (code: string) => {
  state.currDragKeyCode = code
}

const handleDragOver = (e: Event, targetCode: string) => {
  e.preventDefault() // 阻止松开按键后的返回动画
  state.targetDragKeyCode = targetCode
}

const handleDragEnd = () => {
  if (state.currDragKeyCode === state.targetDragKeyCode) {
    return
  }
  onCommitFuncWrap(() => {
    const targetData = localConfig.bookmark.keymap[state.targetDragKeyCode]
    localConfig.bookmark.keymap[state.targetDragKeyCode] = localConfig.bookmark.keymap[state.currDragKeyCode]
    localConfig.bookmark.keymap[state.currDragKeyCode] = targetData
    state.keyCode = state.targetDragKeyCode
  })
}

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
  // 计算第一行的宽度
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
  <NCard id="popup" :title="`${$t('common.config')}${$t('setting.bookmark')}`">
    <NForm label-placement="left" :label-width="55" require-mark-placement="left" :model="state">
      <NFormItem :label="$t('bookmark.urlLabel')" path="url" :rule="{ required: true }">
        <NInput v-model:value="state.url" :placeholder="$t('bookmark.urlPlaceholder')" clearable />
        <NButton text class="set__btn" @click="setCurrentTabUrl()">
          <tabler:current-location class="btn__icon" />
        </NButton>
      </NFormItem>

      <div class="popup__form">
        <NFormItem :label="$t('bookmark.nameLabel')" class="form__name">
          <NInput v-model:value="state.name" :placeholder="getDefaultBookmarkNameFromUrl(state.url)" clearable />
        </NFormItem>
        <NFormItem :label="$t('bookmark.shortcutLabel')" class="form__shortcut">
          <NInputGroupLabel
            v-if="localConfig.bookmark.isListenBackgroundKeystrokes"
            class="shortcut__main"
            :title="globalState.allCommandsMap[state.keyCode]"
            @click="openConfigShortcutsPage()"
          >
            <template v-if="globalState.allCommandsMap[state.keyCode]">
              {{ globalState.allCommandsMap[state.keyCode] }}
            </template>
            <ic:outline-add v-else-if="KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST.includes(state.keyCode)" />
            <ion:ban v-else />
          </NInputGroupLabel>
        </NFormItem>
      </div>

      <NFormItem :label="$t('bookmark.keyLabel')" path="key" :rule="{ required: true }">
        <NSpin :show="state.isCommitLoading">
          <div class="popup__keyboard">
            <div v-for="(rowData, rowIndex) of currKeyboardConfig.list" :key="rowIndex" class="keyboard__row">
              <div
                v-for="code of rowData"
                :key="code"
                class="row__keycap-wrap"
                :style="getKeycapWrapStyle(code)"
                :draggable="state.isBookmarkDragEnabled"
                @dragstart="handleDragStart(code)"
                @dragover="handleDragOver($event, code)"
                @dragend="handleDragEnd()"
              >
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
                      :draggable="state.isBookmarkDragEnabled"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NSpin>
      </NFormItem>
    </NForm>

    <div class="popup__footer">
      <NButton class="footer__btn" type="primary" :disabled="isCommitBtnDisabled" :loading="state.isCommitLoading" @click="onCommitConfigBookmark()">
        {{ $t('common.save') }}
      </NButton>
      <Tips :content="$t('popup.commitBtnTips')" />
    </div>
  </NCard>
</template>

<style scoped>
#popup {
  padding-right: 10px;
  width: v-bind(popupMainWidth);
  border-radius: 0 !important;
  .set__btn {
    margin-left: 20px;
    .btn__icon {
      font-size: 16px;
    }
  }
  .popup__form {
    display: flex;
    align-items: center;
    .form__name {
      width: 65%;
    }
    .form__shortcut {
      margin-left: 5%;
      width: 30%;
      .shortcut__main {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0;
        width: 100%;
        line-height: 34px;
        text-align: center;
        font-size: 14px;
        cursor: alias;
      }
    }
  }

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
      width: 140px;

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
