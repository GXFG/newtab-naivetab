<template>
  <BookmarkPicker :show="state.isBookmarkModalVisible" @close="toggleIsBookmarkPickerVisible" @select="onSelectBookmark" />

  <NCollapse class="setting__content" display-directive="show" :default-expanded-names="['bookmarkKeyboard']">
    <!-- bookmarkKeyboard -->
    <NCollapseItem :title="$t('setting.bookmarkKeyboard')" name="bookmarkKeyboard">
      <BaseComponentSetting cname="bookmark">
        <template #header>
          <NFormItem :label="$t('bookmark.dblclickKeyToOpen')">
            <div class="setting__input-wrap">
              <div class="setting__input_item">
                <NSwitch v-model:value="localState.setting.bookmark.isDblclickOpen" />
                <Tips :content="$t('bookmark.dblclickKeyToOpenTips')" />
              </div>
              <div v-if="localState.setting.bookmark.isDblclickOpen" class="setting__input_item">
                <span class="setting__row-element">{{ $t('bookmark.intervalTime') }}</span>
                <NInputNumber v-model:value="localState.setting.bookmark.dblclickIntervalTime" class="setting__input-number--unit" :min="0" :step="1">
                  <template #suffix>
                    ms
                  </template>
                </NInputNumber>
                <Tips :content="$t('bookmark.intervalTimeTips')" />
              </div>
            </div>
          </NFormItem>
          <NFormItem :label="$t('bookmark.newTabOpen')">
            <NSwitch v-model:value="localState.setting.bookmark.isNewTabOpen" />
          </NFormItem>
          <NFormItem :label="$t('bookmark.showNumberKey')">
            <NSwitch v-model:value="localState.setting.bookmark.isNumberEnabled" />
          </NFormItem>
          <NFormItem :label="$t('bookmark.showSymbolKey')">
            <NSwitch v-model:value="localState.setting.bookmark.isSymbolEnabled" />
          </NFormItem>
          <NFormItem :label="$t('bookmark.showName')">
            <NSwitch v-model:value="localState.setting.bookmark.isNameVisible" />
          </NFormItem>

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
            </NInputGroup>
            <div class="bookmark__content">
              <!-- left: keyList -->
              <div class="content__key">
                <div v-for="rowData of keyboardSettingRowList" :key="rowData" class="bookmark__group">
                  <NInputGroupLabel v-for="key of rowData" :key="key" class="bookmark__key">
                    {{ `${key.toUpperCase()}` }}
                  </NInputGroupLabel>
                </div>
              </div>
              <!-- right: config -->
              <div class="content__config">
                <transition-group v-for="rowData of keyboardSettingRowList" :key="rowData" name="flip-list" tag="div" class="bookmark__group">
                  <NInputGroup
                    v-for="key of rowData"
                    :key="key"
                    class="bookmark__item"
                    :draggable="state.isBookmarkDragEnabled"
                    @dragstart="handleDragStart(key)"
                    @dragenter="handleDragEnter($event, key)"
                    @dragover="handleDragOver($event)"
                    @dragend="handleDragEnd()"
                  >
                    <template v-if="localState.setting.bookmark.keymap[key]">
                      <NInput
                        key="url"
                        v-model:value="localState.setting.bookmark.keymap[key].url"
                        class="input__main"
                        type="text"
                        clearable
                        :placeholder="$t('bookmark.urlPlaceholder')"
                      />
                      <NInput
                        key="name"
                        v-model:value="localState.setting.bookmark.keymap[key].name"
                        class="input__main"
                        type="text"
                        clearable
                        :placeholder="getDefaultBookmarkName(localState.setting.bookmark.keymap[key].url)"
                      />
                      <NInputGroupLabel class="item__move" @mousedown="onBookmarkStartDrag" @mouseup="onBookmarkStopDrag">
                        <cil:resize-height />
                      </NInputGroupLabel>
                      <NButton @click="onImportBookmark(key)">
                        <lucide:bookmark-plus />
                      </NButton>
                      <NPopconfirm @positive-click="onDeleteKey(key)">
                        <template #trigger>
                          <NButton>
                            <ri:delete-bin-6-line />
                          </NButton>
                        </template>
                        {{ $t('common.confirm') }}?
                      </NPopconfirm>
                    </template>
                    <NButton v-else class="item__create" @click="onCreateKey(key)">
                      <zondicons:add-solid />
                    </NButton>
                  </NInputGroup>
                </transition-group>
              </div>
            </div>
          </div>
        </template>
      </BaseComponentSetting>
    </NCollapseItem>
  </NCollapse>
</template>

<script setup lang="ts">
import BookmarkPicker from './BookmarkPicker.vue'
import { localState, keyboardSettingRowList, getDefaultBookmarkName, requestPermission } from '@/logic'

const state = reactive({
  isBookmarkModalVisible: false,
  isBookmarkDragEnabled: false,
  currDragKey: '',
  currImporKey: '',
})

const toggleIsBookmarkPickerVisible = () => {
  state.isBookmarkModalVisible = !state.isBookmarkModalVisible
}

const onCreateKey = (key: string) => {
  localState.setting.bookmark.keymap[key] = {
    url: '',
    name: '',
  }
}

const onDeleteKey = (key: string) => {
  delete localState.setting.bookmark.keymap[key]
}

const onBookmarkStartDrag = () => {
  state.isBookmarkDragEnabled = true
}

const onBookmarkStopDrag = () => {
  state.isBookmarkDragEnabled = false
}

const handleDragStart = (key: string) => {
  state.currDragKey = key
}

const handleDragEnter = (e: any, targetKey: string) => {
  e.preventDefault()
  if (state.currDragKey === targetKey) {
    return
  }
  const targetData = localState.setting.bookmark.keymap[targetKey]
  localState.setting.bookmark.keymap[targetKey] = localState.setting.bookmark.keymap[state.currDragKey]
  localState.setting.bookmark.keymap[state.currDragKey] = targetData
  state.currDragKey = targetKey
}

const handleDragOver = (e: any) => {
  e.preventDefault() // 阻止松开按键后的返回动画
}

const handleDragEnd = () => {
  onBookmarkStopDrag()
}

const onImportBookmark = async(key: string) => {
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    return
  }
  state.currImporKey = key
  toggleIsBookmarkPickerVisible()
}

const onSelectBookmark = (payload: ChromeBookmarkItem) => {
  localState.setting.bookmark.keymap[state.currImporKey] = {
    url: payload.url,
    name: payload.title,
  }
}
</script>

<style>
.flip-list-move {
  transition: transform 0.8s ease;
}

.modal__bookmark {
  .bookmark__label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .label__text {
      opacity: 0.6;
      &:nth-of-type(1) {
        width: 43px;
        text-align: center;
      }
      &:nth-of-type(2) {
        width: 50%;
        text-align: center;
      }
      &:nth-of-type(3) {
        width: 50%;
        padding-left: 7%;
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
        .input__main {
          &:nth-of-type(1) {
            flex: 1;
          }
          &:nth-of-type(2) {
            width: 25%;
          }
        }
        .item__create {
          flex: 1;
        }
        .item__move {
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: row-resize;
        }
      }
    }
  }
}
</style>
