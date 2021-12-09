<template>
  <ComponentLayout field="general" :divider-name="$t('general.entryIconLayout')">
    <NFormItem :label="$t('general.pageTitle')">
      <NInput v-model:value="globalState.setting.general.pageTitle" type="text" placeholder=" " />
    </NFormItem>
    <NFormItem :label="$t('common.theme')">
      <NSelect v-model:value="globalState.setting.general.theme" :options="state.themeList"></NSelect>
    </NFormItem>
    <NFormItem :label="$t('general.language')">
      <NSelect
        v-model:value="proxy.$i18n.locale"
        :options="i18n.global.availableLocales.map((locale: string) => ({
          label: locale,
          value: locale
        }))"
        @update:value="onChangeLocale"
      ></NSelect>
    </NFormItem>
    <NFormItem :label="$t('general.drawerPlacement')">
      <NSelect v-model:value="globalState.setting.general.drawerPlacement" :options="state.drawerPlacementList"></NSelect>
    </NFormItem>
  </ComponentLayout>

  <ElementConfig field="general" :divider-name="$t('general.globalStyle')" />

  <NForm label-placement="left" :label-width="100">
    <NDivider title-placement="left">
      {{ $t('general.settingDividerSetting') }}
    </NDivider>
    <NFormItem :label="$t('general.syncTime')">
      <p>{{ syncTime }}</p>
    </NFormItem>
    <NFormItem :label="$t('general.importSettingsLabel')">
      <NButton @click="onImportSetting">
        {{ $t('general.importSettingsValue') }}
      </NButton>
      <input ref="fileInputEl" style="display: none" type="file" @change="onImportFileChange" />
    </NFormItem>
    <NFormItem :label="$t('general.exportSettingLabel')">
      <NButton @click="onExportSetting()">
        {{ $t('general.exportSettingValue') }}
      </NButton>
    </NFormItem>
    <NFormItem :label="$t('general.resetSettingLabel')">
      <NPopconfirm @positive-click="onResetSetting()">
        <template #trigger>
          <NButton dashed type="error">
            {{ $t('general.resetSettingValue') }}
          </NButton>
        </template>
        {{ $t('common.confirm') }}?
      </NPopconfirm>
    </NFormItem>
  </NForm>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { NForm, NFormItem, NButton, NSelect, NInput, NDivider, NPopconfirm } from 'naive-ui'
import { gaEvent, importSetting, exportSetting, resetSetting, globalState } from '@/logic'
import i18n from '@/lib/i18n'

const { proxy }: any = getCurrentInstance()

const state = reactive({
  themeList: [] as TSelectItem[],
  drawerPlacementList: [] as TSelectItem[],
})

const initEnumData = () => {
  state.themeList = [
    { label: window.$t('common.light'), value: 'light' },
    { label: window.$t('common.dark'), value: 'dark' },
    { label: window.$t('common.auto'), value: 'auto' },
  ]
  state.drawerPlacementList = [
    { label: window.$t('common.left'), value: 'left' },
    { label: window.$t('common.right'), value: 'right' },
    { label: window.$t('common.top'), value: 'top' },
    { label: window.$t('common.bottom'), value: 'bottom' },
  ]
}

initEnumData()

watch(
  () => globalState.setting.general.lang,
  () => {
    initEnumData()
  },
)

const onChangeLocale = (locale: string) => {
  proxy.$i18n.locale = locale
  globalState.setting.general.lang = locale
  gaEvent('setting-locale', 'click', 'change')
}

const syncTime = computed(() => {
  return dayjs(globalState.setting.syncTime).format('YYYY-MM-DD HH:mm:ss')
})

const fileInputEl = ref()

const onImportSetting = () => {
  (fileInputEl as any).value.value = null
  fileInputEl.value.click()
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
