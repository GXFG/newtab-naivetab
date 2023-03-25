<script setup lang="ts">
import BookmarkPicker from './BookmarkPicker.vue'
import { swatcheColors } from '@/styles/const'
import {
  KEYBOARD_CODE_TO_DEFAULT_CONFIG,
  KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST,
  KEYBOARD_TYPE_OPTION,
  KEYCAP_TYPE_OPTION,
  KEYCAP_PREINSTALL_OPTION,
  KEYCAP_PREINSTALL_MAP,
  availableFontOptions,
  fontSelectRenderLabel,
  globalState,
  localState,
  localConfig,
  currKeyboardConfig,
  getDefaultBookmarkNameFromUrl,
  requestPermission,
  openConfigShortcutsPage,
} from '@/logic'

const state = reactive({
  isBookmarkModalVisible: false,
  isBookmarkDragEnabled: false,
  currDragKeyCode: '',
  currImporKey: '',
})

const onCreateKey = (key: string) => {
  localConfig.bookmark.keymap[key] = {
    url: '',
    name: '',
  }
}

const onDeleteKey = (key: string) => {
  delete localConfig.bookmark.keymap[key]
}

const onBookmarkStartDrag = () => {
  state.isBookmarkDragEnabled = true
}

const onBookmarkStopDrag = () => {
  state.isBookmarkDragEnabled = false
}

const handleDragStart = (code: string) => {
  state.currDragKeyCode = code
}

const handleDragEnter = (targetCode: string) => {
  if (state.currDragKeyCode === targetCode) {
    return
  }
  const targetData = localConfig.bookmark.keymap[targetCode]
  localConfig.bookmark.keymap[targetCode] = localConfig.bookmark.keymap[state.currDragKeyCode]
  localConfig.bookmark.keymap[state.currDragKeyCode] = targetData
  state.currDragKeyCode = targetCode
}

const handleDragOver = (e: Event) => {
  e.preventDefault() // 阻止松开按键后的返回动画
}

const handleDragEnd = () => {
  onBookmarkStopDrag()
}

const onImportBookmark = async (code: string) => {
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    return
  }
  state.currImporKey = code
  state.isBookmarkModalVisible = true
}

const onSelectBookmark = (payload: ChromeBookmarkItem) => {
  localConfig.bookmark.keymap[state.currImporKey] = {
    url: payload.url,
    name: payload.title,
  }
}

const keycapColorSelectRenderLabel = (option: SelectStringItem) => {
  return [
    h(
      'div',
      {
        style: {
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      [
        h('p', {}, option.label),
        h(
          'div',
          {
            style: {
              width: '60%',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            },
          },
          [
            h(
              'p',
              {
                style: {
                  padding: '3px 10px',
                  borderRadius: '3px',
                  color: KEYCAP_PREINSTALL_MAP[option.value].mainFontColor,
                  backgroundColor: KEYCAP_PREINSTALL_MAP[option.value].mainBackgroundColor,
                },
              },
              'QWERTY',
            ),
            h(
              'p',
              {
                style: {
                  marginLeft: '5px',
                  padding: '3px 10px',
                  borderRadius: '3px',
                  color: KEYCAP_PREINSTALL_MAP[option.value].emphasisOneFontColor,
                  backgroundColor: KEYCAP_PREINSTALL_MAP[option.value].emphasisOneBackgroundColor,
                },
              },
              'Control',
            ),
            h(
              'p',
              {
                style: {
                  marginLeft: '5px',
                  padding: '3px 10px',
                  borderRadius: '3px',
                  color: KEYCAP_PREINSTALL_MAP[option.value].emphasisTwoFontColor,
                  backgroundColor: KEYCAP_PREINSTALL_MAP[option.value].emphasisTwoBackgroundColor,
                },
              },
              'Enter',
            ),
          ],
        ),
      ],
    ),
  ]
}

const preinstallTheme = ref(null)

const handleKeycapColorSelectUpdate = (value: string) => {
  localConfig.bookmark.mainFontColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[value].mainFontColor
  localConfig.bookmark.mainBackgroundColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[value].mainBackgroundColor
  localConfig.bookmark.emphasisOneFontColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[value].emphasisOneFontColor
  localConfig.bookmark.emphasisOneBackgroundColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[value].emphasisOneBackgroundColor
  localConfig.bookmark.emphasisTwoFontColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[value].emphasisTwoFontColor
  localConfig.bookmark.emphasisTwoBackgroundColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[value].emphasisTwoBackgroundColor
  preinstallTheme.value = null
}

const customNameInputWidth = computed(() => (localConfig.bookmark.isListenBackgroundKeystrokes ? '24%' : '30%'))
</script>

<template>
  <BookmarkPicker v-model:show="state.isBookmarkModalVisible" @select="onSelectBookmark" />

  <NCollapse display-directive="show">
    <BaseComponentSetting cname="bookmark" :marginRange="[0, 20]" :borderRadiusRange="[0, 40]">
      <template #header>
        <!-- bookmarkConfig -->
        <NCollapseItem :title="$t('setting.bookmarkConfig')" name="bookmarkConfig">
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
              <p v-if="localConfig.bookmark.isListenBackgroundKeystrokes" class="label__text">
                {{ $t('bookmark.shortcutLabel') }}
              </p>
            </NInputGroup>

            <div class="bookmark__content">
              <!-- left: keyList -->
              <div class="content__key">
                <div v-for="(codeList, rowIndex) of currKeyboardConfig.list" :key="rowIndex" class="bookmark__group">
                  <NInputGroupLabel v-for="code of codeList" :key="code" class="bookmark__key">
                    {{ KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].alias || KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].label }}
                  </NInputGroupLabel>
                </div>
              </div>
              <!-- right: config -->
              <div class="content__config">
                <transition-group v-for="codeList of currKeyboardConfig.list" :key="codeList" name="flip-list" tag="div" class="bookmark__group">
                  <NInputGroup
                    v-for="code of codeList"
                    :key="code"
                    class="bookmark__item"
                    :draggable="state.isBookmarkDragEnabled"
                    @dragstart="handleDragStart(code)"
                    @dragenter="handleDragEnter(code)"
                    @dragover="handleDragOver($event)"
                    @dragend="handleDragEnd()"
                  >
                    <template v-if="localConfig.bookmark.keymap[code]">
                      <div class="item__container">
                        <NInput
                          key="url"
                          v-model:value="localConfig.bookmark.keymap[code].url"
                          class="input__main"
                          type="text"
                          clearable
                          :placeholder="$t('bookmark.urlPlaceholder')"
                        />
                        <NInput
                          key="name"
                          v-model:value="localConfig.bookmark.keymap[code].name"
                          class="input__main"
                          type="text"
                          clearable
                          :placeholder="getDefaultBookmarkNameFromUrl(localConfig.bookmark.keymap[code].url)"
                        />
                        <NInputGroupLabel
                          v-if="localConfig.bookmark.isListenBackgroundKeystrokes"
                          class="item__shortcut"
                          :title="globalState.allCommandsMap[code]"
                          @click="openConfigShortcutsPage()"
                        >
                          <template v-if="globalState.allCommandsMap[code]">
                            {{ globalState.allCommandsMap[code] }}
                          </template>
                          <ic:outline-add v-else-if="KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST.includes(code)" />
                          <ion:ban v-else />
                        </NInputGroupLabel>
                      </div>
                      <!-- <NInputGroupLabel class="item__move" @mousedown="onBookmarkStartDrag" @mouseup="onBookmarkStopDrag"> -->
                      <NButton class="item__move" @mousedown="onBookmarkStartDrag" @mouseup="onBookmarkStopDrag">
                        <cil:resize-height />
                      </NButton>
                      <NButton @click="onImportBookmark(code)">
                        <lucide:bookmark-plus />
                      </NButton>
                      <NPopconfirm @positive-click="onDeleteKey(code)">
                        <template #trigger>
                          <NButton>
                            <ri:delete-bin-6-line />
                          </NButton>
                        </template>
                        {{ $t('common.delete') }}?
                      </NPopconfirm>
                    </template>
                    <NButton v-else class="item__create" @click="onCreateKey(code)">
                      <zondicons:add-solid />
                    </NButton>
                  </NInputGroup>
                </transition-group>
              </div>
            </div>
          </div>
        </NCollapseItem>

        <NDivider />

        <NFormItem :label="$t('bookmark.listenBackgroundKeystrokes')">
          <div class="setting__input-wrap">
            <div class="setting__input_item">
              <NSwitch v-model:value="localConfig.bookmark.isListenBackgroundKeystrokes" />
              <Tips :content="$t('bookmark.listenBackgroundKeystrokesTips')" />
            </div>
            <div v-if="localConfig.bookmark.isListenBackgroundKeystrokes" class="setting__input_item">
              <NButton ghost type="primary" @click="openConfigShortcutsPage()">
                <ic:twotone-keyboard-command-key />&nbsp;{{ $t('bookmark.customKeys') }}
              </NButton>
            </div>
          </div>
        </NFormItem>
        <NFormItem :label="$t('bookmark.dblclickKeyToOpen')">
          <div class="setting__input-wrap">
            <div class="setting__input_item">
              <NSwitch v-model:value="localConfig.bookmark.isDblclickOpen" />
              <Tips :content="$t('bookmark.dblclickKeyToOpenTips')" />
            </div>
            <div v-if="localConfig.bookmark.isDblclickOpen" class="setting__input_item">
              <span class="setting__row-element">{{ $t('bookmark.intervalTime') }}</span>
              <NInputNumber
                v-model:value="localConfig.bookmark.dblclickIntervalTime"
                class="setting__item-element setting__input-number--unit"
                :min="0"
                :step="1"
              >
                <template #suffix>
                  ms
                </template>
              </NInputNumber>
              <Tips :content="$t('bookmark.intervalTimeTips')" />
            </div>
          </div>
        </NFormItem>
        <NFormItem :label="$t('bookmark.newTabOpen')">
          <NSwitch v-model:value="localConfig.bookmark.isNewTabOpen" />
        </NFormItem>
        <NFormItem :label="$t('bookmark.showName')">
          <NSwitch v-model:value="localConfig.bookmark.isNameVisible" />
        </NFormItem>
      </template>

      <template #style>
        <NFormItem :label="`${$t('common.margin')}`">
          <NSlider v-model:value="localConfig.bookmark.keycapPadding" :step="0.1" :min="0" :max="10" />
          <NInputNumber
            v-model:value="localConfig.bookmark.keycapPadding"
            class="setting__item-element setting__input-number"
            :step="0.1"
            :min="0"
            :max="10"
          />
        </NFormItem>
        <NFormItem :label="`${$t('common.size')}`">
          <NSlider v-model:value="localConfig.bookmark.keycapSize" :step="1" :min="40" :max="150" />
          <NInputNumber
            v-model:value="localConfig.bookmark.keycapSize"
            class="setting__item-element setting__input-number"
            :step="1"
            :min="40"
            :max="150"
          />
        </NFormItem>
      </template>

      <template #color>
        <NFormItem :label="`${$t('bookmark.keycap')}${$t('common.font')}`">
          <NSelect v-model:value="localConfig.bookmark.keycapKeyFontFamily" :options="availableFontOptions" :render-label="fontSelectRenderLabel" />
          <NInputNumber v-model:value="localConfig.bookmark.keycapKeyFontSize" class="setting__item-element setting__input-number" :step="1" :min="12" :max="50" />
        </NFormItem>
        <NFormItem :label="`${$t('bookmark.nameLabel')}${$t('common.font')}`">
          <NSelect v-model:value="localConfig.bookmark.keycapBookmarkFontFamily" :options="availableFontOptions" :render-label="fontSelectRenderLabel" />
          <NInputNumber v-model:value="localConfig.bookmark.keycapBookmarkFontSize" class="setting__item-element setting__input-number" :step="1" :min="12" :max="50" />
        </NFormItem>
        <NFormItem :label="$t('bookmark.keyboardType')">
          <NRadioGroup v-model:value="localConfig.bookmark.keyboardType">
            <NRadio v-for="item in KEYBOARD_TYPE_OPTION" :key="item.value" :value="item.value">
              {{ item.label }}
            </NRadio>
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('bookmark.keycapType')">
          <NRadioGroup v-model:value="localConfig.bookmark.keycapType">
            <NRadio v-for="item in KEYCAP_TYPE_OPTION" :key="item.value" :value="item.value">
              {{ item.label }}
            </NRadio>
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="`${$t('bookmark.keycap')}${$t('common.theme')}`">
          <NSelect
            v-model:value="preinstallTheme"
            :options="KEYCAP_PREINSTALL_OPTION"
            :render-label="keycapColorSelectRenderLabel"
            @update:value="handleKeycapColorSelectUpdate"
          />
        </NFormItem>
        <p class="setting__label">
          {{ `${$t('common.main')}${$t('bookmark.keycap')} QWERTY` }}
        </p>
        <NFormItem :label="`${$t('common.fontColor')}`">
          <NColorPicker v-model:value="localConfig.bookmark.mainFontColor[localState.currAppearanceCode]" show-preview :swatches="swatcheColors" />
        </NFormItem>
        <NFormItem :label="`${$t('common.backgroundColor')}`">
          <NColorPicker
            v-model:value="localConfig.bookmark.mainBackgroundColor[localState.currAppearanceCode]"
            show-preview
            :swatches="swatcheColors"
          />
        </NFormItem>
        <p class="setting__label">
          {{ `${$t('common.emphasis')}${$t('bookmark.keycap')} Control` }}
        </p>
        <NFormItem :label="`${$t('common.fontColor')}`">
          <NColorPicker
            v-model:value="localConfig.bookmark.emphasisOneFontColor[localState.currAppearanceCode]"
            show-preview
            :swatches="swatcheColors"
          />
        </NFormItem>
        <NFormItem :label="`${$t('common.backgroundColor')}`">
          <NColorPicker
            v-model:value="localConfig.bookmark.emphasisOneBackgroundColor[localState.currAppearanceCode]"
            show-preview
            :swatches="swatcheColors"
          />
        </NFormItem>
        <p class="setting__label">
          {{ `${$t('common.emphasis')}${$t('bookmark.keycap')} Enter` }}
        </p>
        <NFormItem :label="`${$t('common.fontColor')}`">
          <NColorPicker
            v-model:value="localConfig.bookmark.emphasisTwoFontColor[localState.currAppearanceCode]"
            show-preview
            :swatches="swatcheColors"
          />
        </NFormItem>
        <NFormItem :label="`${$t('common.backgroundColor')}`">
          <NColorPicker
            v-model:value="localConfig.bookmark.emphasisTwoBackgroundColor[localState.currAppearanceCode]"
            show-preview
            :swatches="swatcheColors"
          />
        </NFormItem>
      </template>
    </BaseComponentSetting>
  </NCollapse>
</template>

<style>
.flip-list-move {
  transition: transform 0.8s ease;
}

.modal__bookmark {
  .bookmark__label {
    /* position:sticky;
    top: -17px;
    z-index: 2; */
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-right: 130px;
    padding-bottom: 3px;
    .label__text {
      opacity: 0.6;
      text-align: center;
      &:nth-of-type(1) {
        width: 43px;
      }
      &:nth-of-type(2) {
        flex: 1;
      }
      &:nth-of-type(3) {
        width: 25%;
      }
      &:nth-of-type(4) {
        width: 13%;
      }
    }
  }
  .bookmark__content {
    display: flex;
    .content__key {
    }
    .content__config {
    }
    .bookmark__key {
      display: flex;
      justify-content: center;
      margin-right: 5px;
      margin-bottom: 5px;
    }
    .bookmark__group {
      padding-bottom: 10px;
      .bookmark__item {
        margin-bottom: 5px;
        .item__container {
          display: flex;
          .input__main {
            &:nth-of-type(1) {
              flex: 1;
            }
            &:nth-of-type(2) {
              width: v-bind(customNameInputWidth);
            }
          }
          .item__shortcut {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0;
            width: 15%;
            line-height: 34px;
            text-align: center;
            font-size: 12px;
            cursor: alias;
          }
        }
        .item__create {
          flex: 1;
        }
        .item__move {
          cursor: row-resize !important;
        }
      }
    }
  }
}
</style>
