<template>
  <ImagePicker :show="state.isImageModalVisible" @close="toggleIsImageModalVisible" />

  <!-- main -->
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
      <NFormItem :label="$t('general.loadPageAnimation')">
        <NSwitch v-model:value="localState.setting.general.isLoadPageAnimationEnabled" />
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
        <NButton class="setting__row-element" @click="toggleIsImageModalVisible()">
          <tabler:edit />&nbsp;{{ $t('common.edit') }}
        </NButton>
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
        <NSpin :show="isUploadConfigLoading" size="small">
          <p>{{ syncTime }}</p>
        </NSpin>
        <Tips :content="$t('general.syncTimeTips')" />
      </NFormItem>
      <NFormItem :label="$t('general.importSettingsLabel')">
        <NButton :loading="globalState.isImportSettingLoading" @click="onImportSetting">
          <uil:import />&nbsp;{{ $t('general.importSettingsValue') }}
        </NButton>
        <input ref="importSettingInputEl" style="display: none" type="file" accept=".json" @change="onImportFileChange">
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
            <NButton ghost type="error">
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
import ImagePicker from './ImagePicker.vue'
import { exportSetting, gaEvent, localState, globalState, isUploadConfigLoading, importSetting, onRefreshImageList, refreshSetting, resetSetting } from '@/logic'
import i18n from '@/lib/i18n'

const { proxy }: any = getCurrentInstance()

const state = reactive({
  i18nList: i18n.global.availableLocales.map((locale: string) => ({
    label: locale,
    value: locale,
  })),
  isImageModalVisible: false,
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

const onChangeLocale = (locale: string) => {
  proxy.$i18n.locale = locale
  localState.setting.general.lang = locale
  gaEvent('setting-locale', 'click', 'change')
}

const toggleIsImageModalVisible = () => {
  state.isImageModalVisible = !state.isImageModalVisible
  if (state.isImageModalVisible) {
    onRefreshImageList()
  }
}

const syncTime = computed(() => {
  const maxDate = Math.max(localState.common.syncTimeMap.style, localState.common.syncTimeMap.setting)
  return dayjs(maxDate).format('YYYY-MM-DD HH:mm:ss')
})

const importSettingInputEl = ref()
const onImportSetting = () => {
  (importSettingInputEl as any).value.value = null
  importSettingInputEl.value.click()
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
