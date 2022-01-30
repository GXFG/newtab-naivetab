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
        <NSwitch v-model:value="localState.style.general.isBackgroundImageEnabled" />
      </NFormItem>
      <NFormItem v-if="localState.style.general.isBackgroundImageEnabled" :label="$t('common.source')">
        <NSelect v-model:value="localState.style.general.backgroundImageSource" :options="backgroundImageSourceList" style="width: 30%" />
        <!-- local -->
        <template v-if="localState.style.general.backgroundImageSource === 0">
          <NButton class="setting__row-element" @click="onSelectBackgroundImage">
            <uil:import />&nbsp;{{ $t('general.importSettingsValue') }}
          </NButton>
          <Tips :content="$t('general.localBackgroundTips')" />
        </template>
        <!-- bing -->
        <template v-else-if="localState.style.general.backgroundImageSource === 1">
          <NButton class="setting__row-element" @click="onSaveImage()">
            <tabler:world-download />&nbsp;{{ $t('general.saveCurrendImage') }}
          </NButton>
          <NButton class="setting__row-element" :loading="isImageListLoading" @click="onRefreshImageList()">
            <template #icon>
              <div class="icon__wrap">
                <fontisto:spinner-refresh style="font-size: 14px" />
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
          localState.style.general.isBackgroundImageEnabled &&
            localState.style.general.backgroundImageSource === 0 &&
            imageState.localBackgroundFileName.length !== 0
        "
        :label="$t('general.filename')"
      >
        <p>{{ imageState.localBackgroundFileName }}</p>
      </NFormItem>
      <!-- bing -->
      <NFormItem v-else-if="localState.style.general.isBackgroundImageEnabled && localState.style.general.backgroundImageSource === 1" label=" ">
        <div class="setting__image-wrap">
          <div
            v-for="item in imageState.imageList"
            :key="item.url"
            class="image__item"
            :class="{ 'image__item--active': isCurrSelectedImage(item) }"
            @click="onSelectImage(item)"
          >
            <NTooltip trigger="hover">
              <template #trigger>
                <NSpin :show="isCurrSelectedImage(item) && isImageLoading">
                  <img :src="getImageUrlFromBing(item.urlbase, '1366x768')" alt="">
                </NSpin>
              </template>
              <p>{{ item.copyright }}</p>
            </NTooltip>
          </div>
        </div>
      </NFormItem>
      <NFormItem v-if="localState.style.general.isBackgroundImageEnabled" :label="$t('common.blur')">
        <NSlider v-model:value="localState.style.general.bgBlur" :step="0.1" :min="0" :max="200" />
        <NInputNumber v-model:value="localState.style.general.bgBlur" class="setting__input-number" :step="0.1" :min="0" :max="200" />
      </NFormItem>
      <NFormItem v-if="localState.style.general.isBackgroundImageEnabled" :label="$t('common.opacity')">
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
        <NButton @click="onImportSetting">
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
      <NFormItem :label="$t('general.resetStorageLabel')">
        <NButton @click="resetStorage()">
          <ant-design:clear-outlined />&nbsp;{{ $t('general.resetStorageValue') }}
        </NButton>
        <Tips :content="$t('general.resetStorageTips')" />
      </NFormItem>
      <NFormItem :label="$t('general.resetSettingLabel')">
        <NPopconfirm @positive-click="onResetSetting()">
          <template #trigger>
            <NButton dashed type="error">
              <ic:baseline-settings-backup-restore />&nbsp;{{ $t('general.resetSettingValue') }}
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
  getImageUrlFromBing,
  getStyleConst,
  localState,
  imageState,
  downloadImageByUrl,
  importSetting,
  isImageListLoading,
  isImageLoading,
  onRefreshImageList,
  resetStorage,
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
  { label: window.$t('common.bing'), value: 1 },
  { label: window.$t('common.local'), value: 0 },
])

const onChangeLocale = (locale: string) => {
  proxy.$i18n.locale = locale
  localState.setting.general.lang = locale
  gaEvent('setting-locale', 'click', 'change')
}

const isCurrSelectedImage = (item: ImageItem) => item.urlbase === localState.style.general.backgroundImageId

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

const onSaveImage = async() => {
  downloadImageByUrl(localState.style.general.backgroundImageUrl)
}

const onSelectImage = (item: ImageItem) => {
  localState.style.general.backgroundImageId = item.urlbase
}

const syncTime = computed(() => {
  return dayjs(localState.common.syncTime).format('YYYY-MM-DD HH:mm:ss')
})

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
.setting__image-wrap {
  display: flex;
  flex-wrap: wrap;
  .image__item {
    margin: 0 3% 2% 0;
    width: 30%;
    border-radius: 2px;
    cursor: pointer;
  }
}
.image__item--active {
  outline: 3px solid v-bind(themeColorMain);
}
</style>
