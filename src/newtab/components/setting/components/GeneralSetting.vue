<template>
  <BaseComponentSetting cname="general" :divider-name="$t('general.globalStyle')">
    <template #header>
      <NFormItem :label="$t('general.pageTitle')">
        <NInput v-model:value="localState.setting.general.pageTitle" type="text" placeholder=" " />
      </NFormItem>
      <NFormItem :label="$t('general.language')">
        <NSelect v-model:value="proxy.$i18n.locale" :options="state.i18nList" @update:value="onChangeLocale" />
      </NFormItem>
      <NFormItem :label="$t('common.drawerSite')">
        <NSelect v-model:value="localState.setting.general.drawerPlacement" :options="drawerPlacementList" />
      </NFormItem>
    </template>

    <template #style>
      <NFormItem :label="$t('common.appearance')">
        <NSelect v-model:value="localState.setting.general.appearance" :options="themeList" />
      </NFormItem>
    </template>

    <template #footer>
      <!-- backgroundImage -->
      <NFormItem :label="$t('common.backgroundImage')">
        <NSwitch v-model:value="localState.setting.general.isBackgroundImageEnabled" />
      </NFormItem>
      <NFormItem v-if="localState.setting.general.isBackgroundImageEnabled" :label="$t('common.source')">
        <NSelect v-model:value="localState.setting.general.backgroundImageSource" :options="backgroundImageSourceList" style="width: 30%" />
        <!-- local -->
        <template v-if="localState.setting.general.backgroundImageSource === 0">
          <NButton class="setting__row-element" @click="onSelectBackgroundImage">
            <uil:import />&nbsp;{{ $t('general.importSettingsValue') }}
          </NButton>
          <Tips :content="$t('general.localBackgroundTips')" />
        </template>
        <!-- bing -->
        <template v-else-if="localState.setting.general.backgroundImageSource === 1">
          <NButton class="setting__row-element" :loading="isImageListLoading" @click="onRefreshImageList()">
            <template #icon>
              <div class="icon__wrap">
                <topcoat:refresh style="font-size: 14px" />
              </div>
            </template>
            {{ $t('common.refresh') }}
          </NButton>
        </template>
        <input ref="bgImageFileInputEl" style="display: none" type="file" accept="image/*" @change="onBackgroundImageFileChange">
      </NFormItem>
      <!-- local -->
      <NFormItem
        v-if="
          localState.setting.general.isBackgroundImageEnabled &&
            localState.setting.general.backgroundImageSource === 0 &&
            imageState.localBackgroundFileName.length !== 0
        "
        :label="$t('general.filename')"
      >
        <p>{{ imageState.localBackgroundFileName }}</p>
      </NFormItem>
      <!-- bing & favorite -->
      <NFormItem v-else-if="localState.setting.general.isBackgroundImageEnabled && localState.setting.general.backgroundImageSource !== 0" label=" ">
        <div class="setting__images">
          <div
            v-for="item in currPreviewImageList"
            :key="item.url"
            class="image__item"
            :class="{ 'image__item--active': getIsCurrSelectedImage(item.id) }"
          >
            <NSpin :show="getIsCurrSelectedImage(item.id) && isImageLoading">
              <img :src="item.url" alt="" @click="onSelectImage(item.id)">
            </NSpin>
            <div v-if="getIsCurrSelectedImage(item.id)" class="item__current">
              <line-md:confirm-circle />
            </div>
            <div class="item__toolbar">
              <NTooltip trigger="hover">
                <template #trigger>
                  <div class="toolbar__icon">
                    <ic:outline-info />
                  </div>
                </template>
                <p>{{ item.desc }}</p>
              </NTooltip>
              <div class="toolbar__icon" @click="onViewImage(item.url)">
                <mdi:eye-circle-outline />
              </div>
              <div class="toolbar__icon" @click="onSaveImage(item.url)">
                <charm:download />
              </div>
              <div v-if="isFavoriteIconVisible(item.id)" class="toolbar__icon" @click="onFavoriteImage(item)">
                <mi:favorite />
              </div>
              <!-- delete -->
              <NPopconfirm v-if="localState.setting.general.backgroundImageSource === 9" @positive-click="onUnFavoriteImage(item.id)">
                <template #trigger>
                  <div class="toolbar__icon">
                    <ri:delete-bin-6-line />
                  </div>
                </template>
                {{ $t('common.confirm') }}?
              </NPopconfirm>
            </div>
          </div>
        </div>
      </NFormItem>

      <NFormItem v-if="localState.setting.general.isBackgroundImageEnabled" :label="$t('common.blur')">
        <NSlider v-model:value="localState.style.general.bgBlur" :step="0.1" :min="0" :max="200" />
        <NInputNumber v-model:value="localState.style.general.bgBlur" class="setting__input-number" :step="0.1" :min="0" :max="200" />
      </NFormItem>
      <NFormItem v-if="localState.setting.general.isBackgroundImageEnabled" :label="$t('common.opacity')">
        <NSlider v-model:value="localState.style.general.bgOpacity" :step="0.01" :min="0" :max="1" />
        <NInputNumber v-model:value="localState.style.general.bgOpacity" class="setting__input-number" :step="0.01" :min="0" :max="1" />
      </NFormItem>

      <!-- setting -->
      <NDivider title-placement="left">
        {{ $t('general.settingDividerSetting') }}
      </NDivider>
      <NFormItem :label="$t('general.syncTime')">
        <p>{{ syncTime }}</p>
        <Tips :content="$t('general.syncTimeTips')" />
      </NFormItem>
      <NFormItem :label="$t('general.importSettingsLabel')">
        <NButton :loading="globalState.isImportSettingLoading" @click="onImportSetting">
          <uil:import />&nbsp;{{ $t('general.importSettingsValue') }}
        </NButton>
        <input ref="settingFileInputEl" style="display: none" type="file" @change="onImportFileChange">
        <Tips :content="$t('general.importSettingsTips')" />
      </NFormItem>
      <NFormItem :label="$t('general.exportSettingLabel')">
        <NButton @click="onExportSetting()">
          <uil:export />&nbsp;{{ $t('general.exportSettingValue') }}
        </NButton>
        <Tips :content="$t('general.exportSettingTips')" />
      </NFormItem>
      <NFormItem :label="$t('general.clearStorageLabel')">
        <NButton :loading="globalState.isClearStorageLoading" @click="refreshSetting()">
          <ant-design:clear-outlined />&nbsp;{{ $t('general.clearStorageValue') }}
        </NButton>
        <Tips :content="$t('general.clearStorageTips')" />
      </NFormItem>
      <NFormItem :label="$t('general.resetSettingLabel')">
        <NPopconfirm @positive-click="onResetSetting()">
          <template #trigger>
            <NButton dashed type="error">
              <ic:twotone-restore />&nbsp;{{ $t('general.resetSettingValue') }}
            </NButton>
          </template>
          {{ $t('common.confirm') }}?
        </NPopconfirm>
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import {
  exportSetting,
  gaEvent,
  currPreviewImageList,
  getStyleConst,
  createTab,
  getImageUrlFromBing,
  localState,
  globalState,
  imageState,
  downloadImageByUrl,
  importSetting,
  isImageListLoading,
  isImageLoading,
  onRefreshImageList,
  refreshSetting,
  resetSetting,
} from '@/logic'
import i18n from '@/lib/i18n'

const { proxy }: any = getCurrentInstance()

const state = reactive({
  i18nList: i18n.global.availableLocales.map((locale: string) => ({
    label: locale,
    value: locale,
  })),
})

const themeList = computed(() => [
  { label: window.$t('common.auto'), value: 'auto' },
  { label: window.$t('common.light'), value: 'light' },
  { label: window.$t('common.dark'), value: 'dark' },
])

const drawerPlacementList = computed(() => [
  { label: window.$t('common.left'), value: 'left' },
  { label: window.$t('common.right'), value: 'right' },
  { label: window.$t('common.top'), value: 'top' },
  { label: window.$t('common.bottom'), value: 'bottom' },
])

const backgroundImageSourceList = computed(() => [
  { label: window.$t('common.local'), value: 0 },
  { label: window.$t('common.favorite'), value: 9 },
  { label: window.$t('common.bing'), value: 1 },
])

const onChangeLocale = (locale: string) => {
  proxy.$i18n.locale = locale
  localState.setting.general.lang = locale
  gaEvent('setting-locale', 'click', 'change')
}

const getIsCurrSelectedImage = (id: string) => id === localState.setting.general.backgroundImageId

const bgImageFileInputEl = ref()
const onSelectBackgroundImage = () => {
  (bgImageFileInputEl as any).value.value = null
  bgImageFileInputEl.value.click()
  gaEvent('setting-background-image', 'click', 'open')
}

const onBackgroundImageFileChange = (e: any) => {
  const file = e.target.files[0]
  if (file.size > 4 * 1024 * 1024) {
    window.$message.error(window.$t('prompts.imageTooLarge'))
    return
  }
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => {
    const res: any = reader.result // base64
    imageState.value.localBackgroundBase64 = res
    imageState.value.localBackgroundFileName = file.name
  }
  gaEvent('setting-background-image', 'click', 'select-file')
}

const onSelectImage = (id: string) => {
  localState.setting.general.backgroundImageId = id
}

const onViewImage = (url: string) => {
  createTab(url)
}

const onSaveImage = (url: string) => {
  downloadImageByUrl(url)
}

const favoriteBackgroundIdList = computed(() => localState.setting.general.favoriteBackgroundList.map((item: ImageListItem) => item.id))
const isFavoriteIconVisible = (id: string) => !favoriteBackgroundIdList.value.includes(id)

const onFavoriteImage = (item: ImageListItem) => {
  localState.setting.general.favoriteBackgroundList.push({
    id: item.id,
    url: item.url,
    desc: item.desc,
  })
}

const onUnFavoriteImage = (id: string) => {
  const index = localState.setting.general.favoriteBackgroundList.findIndex((item: ImageListItem) => item.id === id)
  localState.setting.general.favoriteBackgroundList.splice(index, 1)
}

const syncTime = computed(() => dayjs(localState.common.syncTime).format('YYYY-MM-DD HH:mm:ss'))

const settingFileInputEl = ref()
const onImportSetting = () => {
  (settingFileInputEl as any).value.value = null
  settingFileInputEl.value.click()
  gaEvent('setting-import', 'click', 'open')
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
  gaEvent('setting-import', 'click', 'select-file')
}

const onExportSetting = () => {
  exportSetting()
  gaEvent('setting-export', 'click', 'open')
}

const onResetSetting = () => {
  resetSetting()
  gaEvent('setting-reset', 'click', 'open')
}

const themeColorMain = getStyleConst('themeColorMain')
</script>

<style scoped>
.setting__images {
  display: flex;
  flex-wrap: wrap;
  .image__item {
    flex: 0 0 auto;
    position: relative;
    margin: 0 3% 2% 0;
    width: 30%;
    border-radius: 2px;
    cursor: pointer;
    overflow: hidden;
    &:hover {
      .item__toolbar {
        bottom: 0 !important;
      }
    }
    .item__toolbar {
      z-index: 2;
      position: absolute;
      bottom: -20px;
      left: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      width: 100%;
      height: 20px;
      background-color: rgba(0, 0, 0, 0.5);
      transition: all 0.3s ease;
      .toolbar__icon {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }
    .item__current {
      z-index: 1;
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      font-size: 26px;
      background-color: rgba(0, 0, 0, 0.3);
      color: v-bind(themeColorMain);
    }
  }
  .image__item--active {
    outline: 2px solid v-bind(themeColorMain);
  }
}
</style>
