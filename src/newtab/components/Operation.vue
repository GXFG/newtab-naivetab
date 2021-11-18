<template>
  <div id="setting">
    <!-- 入口 -->
    <button
      class="setting__entry"
      :title="`${$t('setting.mainLabel')}`"
      @click="toggleIsSettingMode()"
    >
      <span v-if="isSettingMode">
        <mdi:chevron-right-circle class="icon__main" />
      </span>
      <span v-else>
        <ic:baseline-settings class="icon__main" />
      </span>
    </button>
    <!-- 弹窗 -->
    <div class="setting__modal" :class="{ '!right-0': isSettingMode }">
      <!-- tab -->
      <ul class="modal__tab">
        <li
          v-for="tab of SETTING_TAB_LIST"
          :key="tab.value"
          class="tab__item"
          :class="{ 'tab__item--active': tab.value === currTab }"
          @click="onChangeTab(tab.value)"
        >
          {{ $t(`setting.${tab.label}`) }}
        </li>
      </ul>
      <!-- 通用 -->
      <div v-show="currTab === 1" class="modal__generic">
        <div class="generic__item">
          <label class="item__label">{{ $t('setting.restoreSettings') }}:</label>
          <button class="item__btn" @click="downloadSetting()">
            <mdi:cloud-download class="icon__main" />
          </button>
        </div>
        <div class="generic__item">
          <label class="item__label">{{ $t('setting.backupSettings') }}:</label>
          <button class="item__btn" @click="uploadSetting()">
            <mdi:cloud-upload class="icon__main" />
          </button>
        </div>
        <div class="generic__item">
          <label class="item__label">{{ $t('setting.lastSyncTime') }}:</label>
          <p>{{ syncTime }}</p>
        </div>
        <div class="generic__item">
          <label class="item__label">{{ $t('setting.language') }}:</label>
          <select v-model="proxy.$i18n.locale" class="item__locale" @change="onChangeLocale">
            <option
              v-for="locale in i18n.global.availableLocales"
              :key="locale"
              :value="locale"
              class="locale__option"
            >
              {{ locale }}
            </option>
          </select>
        </div>
      </div>
      <!-- 书签 -->
      <ul v-show="currTab === 2" class="modal__bookmarks">
        <li v-for="key of KEYBOARD_KEY" :key="key" class="bookmarks__item">
          <div class="item__key">
            <span>{{ `${key.toUpperCase()}` }}</span>
          </div>
          <!-- 存在配置的书签 -->
          <div v-if="globalState.setting.bookmarks[key]" class="item__content">
            <div v-for="field of ['url', 'name', 'icon']" :key="field" class="content__input">
              <label class="input__label">{{ $t(`setting.${field}Label`) }}:</label>
              <input
                v-model="globalState.setting.bookmarks[key][field as 'url' | 'name' | 'icon']"
                class="input__main"
                type="text"
                :placeholder="$t(`setting.${field}Placeholder`)"
              />
            </div>
            <div class="content__icon">
              <ri:delete-bin-6-line class="icon__main" @click="onDeleteKey(key)" />
            </div>
          </div>
          <!-- 创建 -->
          <div v-else class="item__content">
            <div class="content__icon">
              <zondicons:add-solid class="icon__main" @click="onAddKey(key)" />
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import i18n from '@/locales'
import { SETTING_TAB_LIST, KEYBOARD_KEY, uploadSetting, downloadSetting, globalState, isSettingMode, toggleIsSettingMode } from '@/logic'

const currTab = ref(1)

const onChangeTab = (value: number) => {
  currTab.value = value
}

const { proxy }: any = getCurrentInstance()

const onChangeLocale = (e: any) => {
  const data = (e.target as HTMLInputElement).value
  proxy.$i18n.locale = data
  globalState.setting.common.localLanguage = data
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

</script>

<style scoped>
#setting {
  user-select: none;
  .setting__entry {
    position: fixed;
    top: 50vh;
    right: 20px;
    z-index: 10;
    display: flex;
    justify-content: center;
    align-items: center;
    .icon__main {
      font-size: 20px;
    }
  }
  .setting__modal {
    z-index: 2;
    position: fixed;
    top: 5vh;
    right: -540px;
    width: 550px;
    height: 90vh;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    background-color: var(--bg-operation-main);
    transition: all 0.3s ease;
    overflow-y: scroll;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
    .modal__tab {
      display: flex;
      align-items: center;
      background-color: var(--bg-main);
      .tab__item {
        width: 100px;
        height: 50px;
        line-height: 50px;
        text-align: center;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        background-color: var(--bg-operation-item);
        cursor: pointer;
      }
      .tab__item--active {
        background-color: var(--bg-operation-main) !important;
        /* background-color: var(--bg-operation-key) !important; */
      }
    }
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
          .icon__main {
            font-size: 18px;
          }
        }
        .item__locale {
          width: 100px;
          height: 25px;
          text-align: center;
          border-radius: 3px;
          background-color: var(--bg-operation-input);
          .locale__option {
          }
        }
      }
    }
    .modal__bookmarks {
      padding: 0 10px;
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
          .content__icon {
            cursor: pointer;
            .icon__main {
              font-size: 16px;
            }
          }
          .content__input {
            display: flex;
            align-items: center;
            margin-right: 10px;
            &:nth-of-type(1) {
              .input__main {
                width: 140px;
              }
            }
            &:nth-of-type(2) {
              .input__main {
                width: 90px;
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
            .input__main {
              padding: 0 5px;
              width: 120px;
              height: 25px;
              color: var(--text-color-main);
              background-color: var(--bg-operation-input);
              border-radius: 3px;
              &::-webkit-input-placeholder {
                color: var(--text-color-main);
                font-size: 12px;
              }
            }
          }
        }
      }
    }
  }
}
</style>
