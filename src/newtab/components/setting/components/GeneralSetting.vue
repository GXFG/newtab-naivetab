<template>
  <ElementLayout field="general">
    <NFormItem :label="$t('general.pageTitle')">
      <NInput v-model:value="globalState.setting.general.pageTitle" type="text" placeholder=" " />
    </NFormItem>
    <NFormItem :label="$t('common.theme')">
      <NSelect v-model:value="globalState.setting.general.theme" :options="state.themeList" />
    </NFormItem>
    <NFormItem :label="$t('general.language')">
      <NSelect v-model:value="proxy.$i18n.locale" :options="state.i18nList" @update:value="onChangeLocale" />
    </NFormItem>
    <NFormItem :label="$t('common.drawerSite')">
      <NSelect v-model:value="globalState.setting.general.drawerPlacement" :options="state.drawerPlacementList" />
    </NFormItem>
    <NFormItem :label="$t('general.setttingIcon')">
      <NSwitch v-model:value="globalState.setting.general.isSetttingIconEnabled" />
      <Tips :content="$t('general.setttingIconTips')" />
    </NFormItem>
  </ElementLayout>

  <!-- backgroundImage -->
  <ElementConfig field="general" :divider-name="$t('general.globalStyle')">
    <NFormItem :label="$t('common.backgroundImage')">
      <NSwitch v-model:value="globalState.style.general.isBackgroundImageEnabled" />
    </NFormItem>
    <NFormItem v-if="globalState.style.general.isBackgroundImageEnabled" :label="$t('common.source')">
      <NSelect v-model:value="globalState.style.general.backgroundImageSource" :options="state.backgroundImageSourceList" class="setting__row-element" style="width: 110px" />
      <div class="setting__row-element">
        <template v-if="globalState.style.general.backgroundImageSource === 0">
          <NButton @click="onSelectBackgroundImage">
            <uil:import />&nbsp;{{ $t('general.importSettingsValue') }}
          </NButton>
          <Tips :content="$t('general.localBackgroundTips')" />
        </template>
        <template v-else-if="globalState.style.general.backgroundImageSource === 1">
          <NButton class="setting__row-element" @click="onSaveImage()">
            <ion:save-outline />&nbsp;{{ $t('general.saveCurrendImage') }}
          </NButton>
          <NButton :loading="isImageListLoading" @click="onRefreshImageList()">
            <template #icon>
              <div class="icon__wrap">
                <fontisto:spinner-refresh style="font-size: 14px" />
              </div>
            </template>
            {{ $t('common.refresh') }}
          </NButton>
        </template>
      </div>
      <input ref="bgImageFileInputEl" style="display: none" type="file" accept="image/*" @change="onBackgroundImageFileChange" />
    </NFormItem>
    <NFormItem v-if="globalState.style.general.backgroundImageSource === 0" :label="$t('general.filename')">
      <p>{{ imageState.localBackgroundFileName }}</p>
    </NFormItem>
    <NFormItem v-else-if="globalState.style.general.backgroundImageSource === 1" label=" ">
      <div class="setting__image-wrap">
        <div v-for="(item, index) in imageState.imageList" :key="item.url" class="image__item" :class="{ 'image__item--active': currBackgroundImageId === item.urlbase.slice(7) }" @click="onSelectImage(index)">
          <img :src="getImageUrlFromBing(item.url, '1366x768')" alt="" />
        </div>
      </div>
    </NFormItem>
    <NFormItem v-if="globalState.style.general.isBackgroundImageEnabled" :label="$t('common.blur')">
      <NSlider v-model:value="globalState.style.general.bgBlur" :step="0.1" :min="0" :max="200" />
      <NInputNumber v-model:value="globalState.style.general.bgBlur" class="setting__input-number" :step="0.1" :min="0" :max="200" />
    </NFormItem>
    <NFormItem v-if="globalState.style.general.isBackgroundImageEnabled" :label="$t('common.opacity')">
      <NSlider v-model:value="globalState.style.general.bgOpacity" :step="0.01" :min="0" :max="1" />
      <NInputNumber v-model:value="globalState.style.general.bgOpacity" class="setting__input-number" :step="0.01" :min="0" :max="1" />
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
      <input ref="settingFileInputEl" style="display: none" type="file" @change="onImportFileChange" />
      <Tips :content="$t('general.importSettingsTips')" />
    </NFormItem>
    <NFormItem :label="$t('general.exportSettingLabel')">
      <NButton @click="onExportSetting()">
        <uil:export />&nbsp;{{ $t('general.exportSettingValue') }}
      </NButton>
      <Tips :content="$t('general.exportSettingTips')" />
    </NFormItem>
    <NFormItem :label="$t('general.resetSettingLabel')">
      <NPopconfirm @positive-click="onResetSetting()">
        <template #trigger>
          <NButton dashed type="error">
            <ic:round-reset-tv />&nbsp;{{ $t('general.resetSettingValue') }}
          </NButton>
        </template>
        {{ $t('common.confirm') }}?
      </NPopconfirm>
    </NFormItem>
  </ElementConfig>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { NDivider, NFormItem, NButton, NSelect, NInput, NInputNumber, NSlider, NSwitch, NPopconfirm } from 'naive-ui'
import { gaEvent, importSetting, exportSetting, resetSetting, globalState, imageState, currBackgroundImageId, getImageUrlFromBing, isImageListLoading, onRefreshImageList } from '@/logic'
import i18n from '@/lib/i18n'

const { proxy }: any = getCurrentInstance()

const state = reactive({
  themeList: [] as TSelectItem[],
  drawerPlacementList: [] as TSelectItem[],
  backgroundImageSourceList: [] as TEnum[],
  i18nList: i18n.global.availableLocales.map((locale: string) => ({
    label: locale,
    value: locale,
  })),
})

const initEnumData = () => {
  state.themeList = [
    { label: window.$t('common.auto'), value: 'auto' },
    { label: window.$t('common.light'), value: 'light' },
    { label: window.$t('common.dark'), value: 'dark' },
  ]
  state.drawerPlacementList = [
    { label: window.$t('common.left'), value: 'left' },
    { label: window.$t('common.right'), value: 'right' },
    { label: window.$t('common.top'), value: 'top' },
    { label: window.$t('common.bottom'), value: 'bottom' },
  ]
  state.backgroundImageSourceList = [
    { label: window.$t('common.bing'), value: 1 },
    { label: window.$t('common.local'), value: 0 },
  ]
}

watch(
  () => globalState.setting.general.lang,
  () => {
    initEnumData()
  },
  { immediate: true },
)

const onChangeLocale = (locale: string) => {
  proxy.$i18n.locale = locale
  globalState.setting.general.lang = locale
  gaEvent('setting-locale', 'click', 'change')
}

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
const onSaveImage = () => {
  window.open(globalState.style.general.backgroundImageUrl)
}
const onSelectImage = (index: number) => {
  imageState.value.currImageIndex = index
}

const syncTime = computed(() => {
  return dayjs(globalState.setting.syncTime).format('YYYY-MM-DD HH:mm:ss')
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
</script>

<style scoped>
.setting__image-wrap {
  display: flex;
  flex-wrap: wrap;
  .image__item {
    margin: 1%;
    width: 30%;
    border-radius: 5px;
    cursor: pointer;
  }
}
.image__item--active {
  outline: 2px solid var(--border-main);
}
</style>
