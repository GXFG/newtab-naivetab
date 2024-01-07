<script setup lang="ts">
import { useStorageLocal } from '@/composables/useStorageLocal'
import { gaProxy } from '@/logic/gtag'
import { requestPermission } from '@/logic/storage'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG, KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST, currKeyboardConfig } from '@/logic/keyboard'
import { getDefaultBookmarkNameFromUrl, getFaviconFromUrl, getBookmarkConfigUrl, getBookmarkConfigName } from '@/logic/bookmark'
import { globalState, localConfig, customPrimaryColor, getStyleConst, getAllCommandsConfig, openConfigShortcutsPage } from '@/logic/store'
import BookmarkPicker from '@/components/drawer/BookmarkPicker.vue'

const state = reactive({
  isBookmarkModalVisible: false,
  isBookmarkDragEnabled: true,
  isCommitLoading: false,
  currDragKeyCode: '',
  targetDragKeyCode: '',
  url: '',
  name: '',
  keyCode: '',
})

// 为实现page切换前台时刷新通过pupop修改的书签
const bookmarkPendingData = useStorageLocal('data-bookmark-pending', {
  isPending: false,
})

const setCurrentTabUrl = () => {
  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const currTab = tabs[0]
    state.url = currTab.url || ''
    state.name = currTab.title || ''
  })
}

onMounted(() => {
  setCurrentTabUrl()
  getAllCommandsConfig()
  gaProxy('view', ['popup'], {
    userAgent: navigator.userAgent,
  })
})

const loadCurrKeyConfig = () => {
  if (state.keyCode.length === 0) {
    return
  }
  if (localConfig.bookmark.keymap[state.keyCode] && localConfig.bookmark.keymap[state.keyCode].url) {
    state.url = localConfig.bookmark.keymap[state.keyCode].url
    state.name = localConfig.bookmark.keymap[state.keyCode].name
  }
}

const selectKey = (key: string) => {
  state.keyCode = key
  loadCurrKeyConfig()
}

const isCommitBtnDisabled = computed(() => {
  return state.keyCode.length === 0
})

const handleCommit = (callback: () => void) => {
  state.isCommitLoading = true
  bookmarkPendingData.value.isPending = true
  callback()
  setTimeout(() => {
    state.isCommitLoading = false
    window.$message.success(`${window.$t('common.success')}`)
  }, 1000)
}

const onDeleteKey = () => {
  if (state.keyCode.length === 0) {
    return
  }
  handleCommit(() => {
    delete localConfig.bookmark.keymap[state.keyCode]
  })
}

const onCommitConfigBookmark = () => {
  handleCommit(() => {
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

const onOpenBookmarkPicker = async () => {
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    return
  }
  state.isBookmarkModalVisible = true
}

const onSelectBookmark = (payload: ChromeBookmarkItem) => {
  state.name = payload.title
  state.url = payload.url || ''
  onCommitConfigBookmark()
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
  // 忽略空书签
  if (!localConfig.bookmark.keymap[state.currDragKeyCode]) {
    return
  }
  handleCommit(() => {
    const targetData = localConfig.bookmark.keymap[state.targetDragKeyCode]
    localConfig.bookmark.keymap[state.targetDragKeyCode] = localConfig.bookmark.keymap[state.currDragKeyCode]
    localConfig.bookmark.keymap[state.currDragKeyCode] = targetData
    state.keyCode = state.targetDragKeyCode
  })
}

const popupKeyboardBorder = getStyleConst('popupKeyboardBorder')
const popupKeyboardHoverBg = getStyleConst('popupKeyboardHoverBg')
const popupKeyboardActiveBg = getStyleConst('popupKeyboardActiveBg')

const KEYCAP_BASE_SIZE = 45

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
  let totalWidth = 80
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
  <BookmarkPicker
    v-model:show="state.isBookmarkModalVisible"
    width="60%"
    @select="onSelectBookmark"
  />

  <NCard
    id="popup"
    :title="`${$t('common.config')}${$t('setting.bookmark')}`"
  >
    <NForm
      label-placement="left"
      require-mark-placement="left"
      :label-width="55"
      :show-feedback="false"
      :model="state"
    >
      <NFormItem
        class="form__url"
        :label="$t('bookmark.urlLabel')"
        path="url"
        :rule="{ required: true }"
      >
        <NInput
          v-model:value="state.url"
          :placeholder="$t('bookmark.urlPlaceholder')"
          clearable
          @input="state.url = state.url.replaceAll(' ', '')"
        />

        <div class="url__operation">
          <NButton
            text
            class="operation__btn"
            @click="setCurrentTabUrl()"
          >
            <tabler:current-location class="btn__icon" />
          </NButton>
          <NButton
            text
            class="operation__btn"
            :disabled="state.keyCode.length === 0"
            @click="onOpenBookmarkPicker()"
          >
            <lucide:bookmark-plus class="btn__icon" />
          </NButton>
          <NPopconfirm @positive-click="onDeleteKey()">
            <template #trigger>
              <NButton
                text
                class="operation__btn"
                :disabled="state.keyCode.length === 0 || getBookmarkConfigUrl(state.keyCode).length === 0"
              >
                <ri:delete-bin-6-line class="btn__icon" />
              </NButton>
            </template>
            {{ `${$t('common.delete')} ${KEYBOARD_CODE_TO_DEFAULT_CONFIG[state.keyCode].label}` }} ？
          </NPopconfirm>
        </div>
      </NFormItem>

      <div class="popup__form_wrap">
        <NFormItem
          class="form__name"
          :label="$t('bookmark.nameLabel')"
        >
          <NInput
            v-model:value="state.name"
            :placeholder="getDefaultBookmarkNameFromUrl(state.url)"
            clearable
            @input="state.name = state.name.trim()"
          />
        </NFormItem>

        <NFormItem
          :label="$t('bookmark.shortcutLabel')"
          class="form__shortcut"
        >
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

      <NFormItem
        :label="$t('bookmark.keyLabel')"
        path="key"
        :rule="{ required: true }"
      >
        <NSpin :show="state.isCommitLoading">
          <div class="popup__keyboard">
            <div
              v-for="(rowData, rowIndex) of currKeyboardConfig.list"
              :key="rowIndex"
              class="keyboard__row"
            >
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
                <div
                  class="row__keycap"
                  @click="selectKey(code)"
                >
                  <div
                    v-if="code === state.keyCode"
                    class="keycap__select"
                  >
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
                    />
                  </div>
                  <p class="keycap__name">
                    {{ getBookmarkConfigName(code) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </NSpin>
      </NFormItem>
    </NForm>

    <div class="popup__footer">
      <NButton
        class="footer__commit"
        type="primary"
        :disabled="isCommitBtnDisabled || state.isCommitLoading"
        @click="onCommitConfigBookmark()"
      >
        <mingcute:save-2-line />&nbsp;{{ $t('common.save') }}
      </NButton>

      <Tips :content="$t('popup.commitBtnTips')" />
    </div>
  </NCard>
</template>

<style>
#popup {
  padding-right: 0;
  width: v-bind(popupMainWidth);
  border-radius: 0 !important;
  overflow: hidden;
  .n-card-header {
    padding-top: 12px !important;
    padding-bottom: 3px !important;
    .n-card-header__main {
      font-size: 16px !important;
    }
  }
  .n-card__content {
    padding: 0 12px 12px 12px !important;
  }
  .n-form-item {
    margin: 5px 0;
  }

  .url__operation {
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    padding-left: 10px;
    .operation__btn {
      margin: 0 10px;
      .btn__icon {
        font-size: 16px;
      }
    }
  }

  .popup__form_wrap {
    display: flex;
    align-items: center;
    .form__url {
      width: 100%;
    }
    .form__name {
      width: 70%;
    }
    .form__shortcut {
      margin-left: 5%;
      width: 25%;
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
    cursor: pointer;
    .keyboard__row {
      display: flex;
      .row__keycap-wrap {
        padding: 1px;
        height: v-bind(`${KEYCAP_BASE_SIZE}px`);
        cursor: pointer;
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
          user-select: none;
          transition: all 200ms ease-in-out;
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
            width: 15px;
            .img__main {
              width: 100%;
              height: 100%;
            }
          }
          .keycap__name {
            flex: 0 0 auto;
            width: 100%;
            line-height: 1;
            font-size: 10px;
            text-align: center;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
        }
      }
    }
  }

  .popup__footer {
    display: flex;
    justify-content: center;
    padding-top: 3px;

    .footer__commit {
      width: 120px;
    }
  }
}
</style>
