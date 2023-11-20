<script setup lang="ts">
import i18n from '@/lib/i18n'
import { exportSetting, isUploadConfigLoading, importSetting, refreshSetting, resetSetting } from '@/logic/storage'
import { localConfig, localState, globalState } from '@/logic/store'
import BackgroundDrawer from './BackgroundDrawer.vue'

const { proxy }: any = getCurrentInstance()

const state = reactive({
  i18nList: i18n.global.availableLocales.map((locale: string) => ({
    label: locale,
    value: locale,
  })),
  isBackgroundDrawerVisible: false,
})

const themeList = computed(() => [
  { label: window.$t('general.followSystem'), value: 'auto' },
  { label: window.$t('common.light'), value: 'light' },
  { label: window.$t('common.dark'), value: 'dark' },
])

const drawerPlacementList = computed(() => [
  { label: window.$t('common.left'), value: 'left' },
  { label: window.$t('common.right'), value: 'right' },
  { label: window.$t('common.top'), value: 'top' },
  { label: window.$t('common.bottom'), value: 'bottom' },
])

const focusElementList = computed(() => [
  { label: window.$t('general.focusBrowserDefault'), value: 'default' },
  { label: window.$t('general.focusRoot'), value: 'root' },
  { label: window.$t('setting.search'), value: 'search' },
  { label: window.$t('setting.memo'), value: 'memo' },
  { label: window.$t('setting.bookmarkKeyboard'), value: 'bookmarkKeyboard' },
])

const loadPageAnimationTypeList = computed(() => [
  { label: window.$t('general.fadeIn'), value: 'fade-in' },
  { label: window.$t('general.zoomIn'), value: 'zoom-in' },
])

const onChangeLocale = (locale: string) => {
  proxy.$i18n.locale = locale
  localConfig.general.lang = locale
}

const openBackgroundDrawer = () => {
  state.isBackgroundDrawerVisible = true
}

const syncTime = computed(() => {
  if (!Object.prototype.hasOwnProperty.call(localState.value, 'isUploadConfigStatusMap')) {
    return '0'
  }
  const syncTimeList = [] as number[]
  for (const field of Object.keys(localState.value.isUploadConfigStatusMap)) {
    syncTimeList.push(localState.value.isUploadConfigStatusMap[field].syncTime)
  }
  const maxSyncTime = Math.max(...syncTimeList)
  return dayjs(maxSyncTime).format('YYYY-MM-DD HH:mm:ss')
})

const importSettingInputEl = ref()

const onImportSetting = () => {
  ;(importSettingInputEl as any).value.value = null
  importSettingInputEl.value.click()
}

const onImportFileChange = (e) => {
  const file = e.target.files[0]
  if (!file.name.includes('.json')) {
    e.target.value = null
    return
  }
  const reader = new FileReader()
  reader.readAsText(file)
  reader.onload = () => {
    importSetting(reader.result as string)
  }
}

const onExportSetting = () => {
  exportSetting()
}

const onResetSetting = () => {
  resetSetting()
}
</script>

<template>
  <BackgroundDrawer v-model:show="state.isBackgroundDrawerVisible" />

  <!-- main -->
  <BaseComponentSetting
    cname="general"
    :divider-name="$t('general.globalStyle')"
  >
    <template #header>
      <NFormItem :label="$t('general.pageTitle')">
        <NInput
          v-model:value="localConfig.general.pageTitle"
          type="text"
        />
      </NFormItem>

      <NFormItem :label="$t('general.language')">
        <NSelect
          v-model:value="proxy.$i18n.locale"
          :options="state.i18nList"
          @update:value="onChangeLocale"
        />
      </NFormItem>

      <NFormItem :label="$t('common.drawerSite')">
        <NRadioGroup v-model:value="localConfig.general.drawerPlacement">
          <NRadioButton
            v-for="item in drawerPlacementList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadioButton>
        </NRadioGroup>
      </NFormItem>

      <NFormItem :label="$t('general.defaultFocus')">
        <NSelect
          v-model:value="localConfig.general.openPageFocusElement"
          :options="focusElementList"
        />
      </NFormItem>

      <NFormItem :label="$t('general.loadPageAnimation')">
        <NSwitch v-model:value="localConfig.general.isLoadPageAnimationEnabled" />
        <NRadioGroup
          v-if="localConfig.general.isLoadPageAnimationEnabled"
          v-model:value="localConfig.general.loadPageAnimationType"
          class="setting__item-element"
        >
          <NRadioButton
            v-for="item in loadPageAnimationTypeList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadioButton>
        </NRadioGroup>
      </NFormItem>
    </template>

    <template #style>
      <NFormItem :label="$t('common.appearance')">
        <NRadioGroup v-model:value="localConfig.general.appearance">
          <NRadioButton
            v-for="item in themeList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NRadioButton>
        </NRadioGroup>
      </NFormItem>
    </template>

    <template #footer>
      <!-- backgroundImage -->
      <NFormItem :label="$t('common.backgroundImage')">
        <NSwitch v-model:value="localConfig.general.isBackgroundImageEnabled" />
        <NButton
          v-if="localConfig.general.isBackgroundImageEnabled"
          class="setting__item-element"
          type="primary"
          ghost
          @click="openBackgroundDrawer()"
        >
          <mingcute:finger-press-line />&nbsp;{{ $t('common.select') }}
        </NButton>
      </NFormItem>

      <NFormItem
        v-if="localConfig.general.isBackgroundImageEnabled"
        :label="$t('common.blur')"
      >
        <NSlider
          v-model:value="localConfig.general.bgBlur"
          :step="0.1"
          :min="0"
          :max="200"
        />
        <NInputNumber
          v-model:value="localConfig.general.bgBlur"
          class="setting__item-element setting__input-number"
          :step="0.1"
          :min="0"
          :max="200"
        />
      </NFormItem>

      <NFormItem
        v-if="localConfig.general.isBackgroundImageEnabled"
        :label="$t('common.opacity')"
      >
        <NSlider
          v-model:value="localConfig.general.bgOpacity"
          :step="0.01"
          :min="0"
          :max="1"
        />
        <NInputNumber
          v-model:value="localConfig.general.bgOpacity"
          class="setting__item-element setting__input-number"
          :step="0.01"
          :min="0"
          :max="1"
        />
      </NFormItem>

      <!-- setting -->
      <NDivider title-placement="left">
        {{ $t('general.settingDividerSetting') }}
      </NDivider>

      <NFormItem :label="$t('general.syncTime')">
        <NSpin
          :show="isUploadConfigLoading"
          size="small"
        >
          <p>{{ syncTime }}</p>
        </NSpin>
        <Tips :content="$t('general.syncTimeTips')" />
      </NFormItem>

      <NFormItem :label="$t('general.importExportSettingsLabel')">
        <div>
          <NButton
            type="primary"
            ghost
            :loading="globalState.isImportSettingLoading"
            @click="onImportSetting"
          >
            <uil:import />&nbsp;{{ $t('general.importSettingsValue') }}
          </NButton>
          <input
            ref="importSettingInputEl"
            style="display: none"
            type="file"
            accept=".json"
            @change="onImportFileChange"
          />
          <Tips :content="$t('general.importSettingsTips')" />
        </div>

        <div style="margin-left: 30px">
          <NButton
            type="primary"
            ghost
            @click="onExportSetting()"
          >
            <uil:export />&nbsp;{{ $t('general.exportSettingValue') }}
          </NButton>
          <Tips :content="$t('general.exportSettingTips')" />
        </div>
      </NFormItem>

      <NFormItem :label="$t('general.clearStorageLabel')">
        <NButton
          type="primary"
          ghost
          :loading="globalState.isClearStorageLoading"
          @click="refreshSetting()"
        >
          <ant-design:clear-outlined />&nbsp;{{ $t('general.clearStorageValue') }}
        </NButton>
        <Tips :content="$t('general.clearStorageTips')" />
      </NFormItem>

      <NFormItem :label="$t('general.resetSettingLabel')">
        <NPopconfirm @positive-click="onResetSetting()">
          <template #trigger>
            <NButton
              type="error"
              ghost
            >
              <ic:twotone-restore />&nbsp;{{ $t('general.resetSettingValue') }}
            </NButton>
          </template>
          {{ $t('common.confirm') }}?
        </NPopconfirm>
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
