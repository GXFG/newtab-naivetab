<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { KEYBOARD_CODE_TO_DEFAULT_CONFIG, KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST } from '@/logic/constants/keyboard'
import { currKeyboardConfig } from '@/logic/keyboard'
import { requestPermission } from '@/logic/storage'
import { getDefaultBookmarkNameFromUrl } from '~/newtab/widgets/keyboard/logic'
import { globalState, localConfig, openConfigShortcutsPage } from '@/logic/store'
import BookmarkPicker from '@/components/BookmarkPicker.vue'

const state = reactive({
  isBookmarkModalVisible: false,
  isBookmarkDragEnabled: false,
  currDragKeyCode: '',
  currImporKey: '',
})

const onCreateKey = (key: string) => {
  localConfig.keyboard.keymap[key] = {
    url: '',
    name: '',
  }
}

const onDeleteKey = (key: string) => {
  delete localConfig.keyboard.keymap[key]
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
  const targetData = localConfig.keyboard.keymap[targetCode]
  localConfig.keyboard.keymap[targetCode] = localConfig.keyboard.keymap[state.currDragKeyCode]
  localConfig.keyboard.keymap[state.currDragKeyCode] = targetData
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
  localConfig.keyboard.keymap[state.currImporKey] = {
    url: payload.url,
    name: payload.title,
  }
}

const customNameInputWidth = computed(() => (localConfig.keyboard.isListenBackgroundKeystrokes ? '24%' : '30%'))
</script>

<template>
  <BookmarkPicker
    v-model:show="state.isBookmarkModalVisible"
    @select="onSelectBookmark"
  />
  <!-- bookmarkConfig -->
  <NCollapseItem
    :title="$t('setting.bookmarkConfig')"
    name="bookmarkConfig"
  >
    <div class="modal__bookmark">
      <NInputGroup class="bookmark__label">
        <p class="label__text">
          {{ $t('keyboard.keyLabel') }}
        </p>
        <p class="label__text">
          {{ $t('keyboard.urlLabel') }}
        </p>
        <p class="label__text">
          {{ $t('keyboard.nameLabel') }}
        </p>
        <p
          v-if="localConfig.keyboard.isListenBackgroundKeystrokes"
          class="label__text"
        >
          {{ $t('keyboard.shortcutLabel') }}
        </p>
      </NInputGroup>

      <div class="bookmark__content">
        <!-- left: keyList -->
        <div class="content__key">
          <div
            v-for="(codeList, rowIndex) of currKeyboardConfig.list"
            :key="rowIndex"
            class="bookmark__group"
          >
            <NInputGroupLabel
              v-for="code of codeList"
              :key="code"
              class="bookmark__key"
              size="small"
            >
              {{ KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].alias || KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].label }}
            </NInputGroupLabel>
          </div>
        </div>

        <!-- right: config -->
        <div class="content__config">
          <transition-group
            v-for="codeList of currKeyboardConfig.list"
            :key="codeList.toString()"
            name="flip-list"
            tag="div"
            class="bookmark__group"
          >
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
              <template v-if="localConfig.keyboard.keymap[code]">
                <div class="item__container">
                  <NInput
                    key="url"
                    v-model:value="localConfig.keyboard.keymap[code].url"
                    class="input__main"
                    type="text"
                    size="small"
                    clearable
                    :placeholder="$t('keyboard.urlPlaceholder')"
                  />
                  <NInput
                    key="name"
                    v-model:value="localConfig.keyboard.keymap[code].name"
                    class="input__main"
                    type="text"
                    size="small"
                    clearable
                    :placeholder="getDefaultBookmarkNameFromUrl(localConfig.keyboard.keymap[code].url)"
                  />
                  <NInputGroupLabel
                    v-if="localConfig.keyboard.isListenBackgroundKeystrokes"
                    class="item__shortcut"
                    size="small"
                    :title="globalState.allCommandsMap[code]"
                    @click="openConfigShortcutsPage()"
                  >
                    <template v-if="globalState.allCommandsMap[code]">
                      {{ globalState.allCommandsMap[code] }}
                    </template>
                    <Icon
                      v-else-if="KEYBOARD_COMMAND_ALLOW_KEYCODE_LIST.includes(code)"
                      :icon="ICONS.add"
                    />
                    <Icon
                      v-else
                      :icon="ICONS.ban"
                    />
                  </NInputGroupLabel>
                </div>
                <!-- <NInputGroupLabel class="item__move" @mousedown="onBookmarkStartDrag" @mouseup="onBookmarkStopDrag"> -->
                <NButton
                  class="item__move"
                  size="small"
                  @mousedown="onBookmarkStartDrag"
                  @mouseup="onBookmarkStopDrag"
                >
                  <Icon :icon="ICONS.resizeHeight" />
                </NButton>
                <NButton
                  size="small"
                  @click="onImportBookmark(code)"
                >
                  <Icon :icon="ICONS.bookmarkPlus" />
                </NButton>
                <NPopconfirm @positive-click="onDeleteKey(code)">
                  <template #trigger>
                    <NButton size="small">
                      <Icon :icon="ICONS.deleteBin" />
                    </NButton>
                  </template>
                  {{ $t('common.delete') }}?
                </NPopconfirm>
              </template>

              <NButton
                v-else
                class="item__create"
                size="small"
                @click="onCreateKey(code)"
              >
                <Icon :icon="ICONS.addSolid" />
              </NButton>
            </NInputGroup>
          </transition-group>
        </div>
      </div>
    </div>
  </NCollapseItem>
</template>

<style scoped>
.modal__bookmark {
  .bookmark__label {
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
      font-size: 13px;
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
