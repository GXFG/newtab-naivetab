<template>
  <div id="setting">
    <!-- 入口 -->
    <NButton
      class="setting__entry"
      text
      :title="`${$t('setting.mainLabel')}`"
      @click="toggleIsSettingMode()"
    >
      <ic:baseline-settings v-show="!isSettingMode" class="item__icon" />
      <!-- <mdi:chevron-right-circle v-show="isSettingMode" class="item__icon" /> -->
    </NButton>
    <!-- 弹窗 -->
    <NDrawer v-model:show="isSettingMode" :width="500" placement="right">
      <NDrawerContent>
        <NTabs class="setting__tabs" type="line">
          <!-- 通用 -->
          <NTabPane name="tabGeneral" :tab="$t('setting.tabGeneral')">
            <div class="modal__generic">
              <div class="generic__item">
                <label class="item__label">{{ $t('setting.restoreSettings') }}:</label>
                <NButton class="item__btn" text @click="downloadSetting()">
                  <mdi:cloud-download class="item__icon" />
                </NButton>
              </div>
              <div class="generic__item">
                <label class="item__label">{{ $t('setting.backupSettings') }}:</label>
                <NButton class="item__btn" text @click="uploadSetting()">
                  <mdi:cloud-upload class="item__icon" />
                </NButton>
              </div>
              <div class="generic__item">
                <label class="item__label">{{ $t('setting.lastSyncTime') }}:</label>
                <p>{{ syncTime }}</p>
              </div>
              <div class="generic__item">
                <label class="item__label">{{ $t('setting.importSettings') }}:</label>
                <input type="file" @change="onImportFileChange" />
              </div>
              <div class="generic__item">
                <label class="item__label">{{ $t('setting.exportSettings') }}:</label>
                <NButton class="item__btn" text @click="exportSetting()">
                  <mdi:file-export-outline class="item__icon" />
                </NButton>
              </div>
              <div class="generic__item">
                <label class="item__label">{{ $t('setting.language') }}:</label>
                <NSelect
                  v-model:value="proxy.$i18n.locale"
                  class="item__locale"
                  size="small"
                  :options="i18n.global.availableLocales.map((locale) => ({
                    label: locale,
                    value: locale
                  }))"
                  @update:value="onChangeLocale"
                ></NSelect>
              </div>
            </div>
          </NTabPane>
          <!-- 书签 -->
          <NTabPane name="tabBookmarks" :tab="$t('setting.tabBookmarks')">
            <ul class="modal__bookmarks">
              <li v-for="key of KEYBOARD_KEY" :key="key" class="bookmarks__item">
                <div class="item__key">
                  <span>{{ `${key.toUpperCase()}` }}</span>
                </div>
                <!-- 存在配置的书签 -->
                <div v-if="globalState.setting.bookmarks[key]" class="item__content">
                  <div v-for="field of ['url', 'name']" :key="field" class="content__input">
                    <label class="input__label">{{ $t(`setting.${field}Label`) }}:</label>
                    <NInput
                      v-model:value="globalState.setting.bookmarks[key][field as 'url' | 'name' | 'icon']"
                      class="input__main"
                      size="small"
                      type="text"
                      clearable
                      :placeholder="$t(`setting.${field}Placeholder`)"
                    />
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
          </NTabPane>
        </NTabs>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { NDrawer, NDrawerContent, NButton, NSelect, NInput, NTabs, NTabPane } from 'naive-ui'
import { KEYBOARD_KEY, uploadSetting, downloadSetting, importSetting, exportSetting, globalState, isSettingMode, toggleIsSettingMode } from '@/logic'
import i18n from '@/locales'

const { proxy }: any = getCurrentInstance()

const onChangeLocale = (locale) => {
  proxy.$i18n.locale = locale
  globalState.setting.generic.localLanguage = locale
}

const syncTime = computed(() => {
  return dayjs(globalState.setting.lastSyncTimestamp).format('YYYY-MM-DD HH:mm:ss')
})

const onAddKey = (key: string) => {
  globalState.setting.bookmarks[key] = {
    url: '',
    name: '',
    icon: '',
  }
}

const onDeleteKey = (key: string) => {
  delete globalState.setting.bookmarks[key]
}

const onImportFileChange = (e: any) => {
  const file = e.target.files[0]
  if (!file.name.includes('.json')) {
    e.target.value = null
    return
  }
  const reader = new FileReader()
  reader.readAsText(file)
  reader.onload = () => {
    importSetting(reader.result as any)
  }
}

</script>

<style>
#setting {
  user-select: none;
  .setting__entry {
    position: fixed;
    top: 50vh;
    right: 20px;
    z-index: 10;
    .item__icon {
      font-size: 20px;
    }
  }
}
.setting__tabs {
  user-select: none;
  .modal__generic {
    display: flex;
    flex-direction: column;
    .generic__item {
      display: flex;
      align-items: center;
      height: 35px;
      .item__label {
        padding-right: 10px;
        width: 200px;
        text-align: right;
      }
      .item__btn {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .item__icon {
        font-size: 18px;
      }
      .item__locale {
        width: 100px;
      }
    }
  }
  .modal__bookmarks {
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
          &:nth-of-type(1) {
            flex: 1;
          }
          &:nth-of-type(2) {
            .input__main {
              width: 95px;
            }
          }
          &:nth-of-type(3) {
            .input__main {
              width: 90px;
            }
          }
          .input__label {
            flex: 0 0 auto;
            padding-right: 5px;
          }
        }
      }
    }
  }
}
</style>
