<template>
  <div class="modal__general">
    <NForm
      ref="formRef"
      label-placement="left"
      :label-width="100"
    >
      <NDivider title-placement="left">
        {{ $t('general.settingDividerSetting') }}
      </NDivider>

      <NFormItem :label="$t('general.lastSyncTime')">
        <p>{{ syncTime }}</p>
      </NFormItem>
      <NFormItem :label="$t('general.importSettingsLabel')">
        <NButton @click="onImportSetting">
          {{ $t('general.importSettingsValue') }}
        </NButton>
        <input ref="fileInputEl" style="display: none" type="file" @change="onImportFileChange" />
      </NFormItem>
      <NFormItem :label="$t('general.exportSettingLabel')">
        <NButton @click="exportSetting()">
          {{ $t('general.exportSettingValue') }}
        </NButton>
      </NFormItem>

      <NDivider title-placement="left">
        {{ $t('general.settingDividerLanguage') }}
      </NDivider>

      <NFormItem :label="$t('general.language')">
        <NSelect
          v-model:value="proxy.$i18n.locale"
          class="item__locale"
          size="small"
          :options="i18n.global.availableLocales.map((locale: string) => ({
            label: locale,
            value: locale
          }))"
          @update:value="onChangeLocale"
        ></NSelect>
      </NFormItem>
    </NForm>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { NForm, NFormItem, NButton, NSelect, NDivider } from 'naive-ui'
import { importSetting, exportSetting, globalState } from '@/logic'
import i18n from '@/locales'

const { proxy }: any = getCurrentInstance()

const onChangeLocale = (locale: string) => {
  proxy.$i18n.locale = locale
  globalState.setting.general.lang = locale
}

const syncTime = computed(() => {
  return dayjs(globalState.setting.syncTime).format('YYYY-MM-DD HH:mm:ss')
})

const fileInputEl = ref()

const onImportSetting = () => {
  (fileInputEl as any).value.value = null
  fileInputEl.value.click()
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
.modal__general {
}
</style>
