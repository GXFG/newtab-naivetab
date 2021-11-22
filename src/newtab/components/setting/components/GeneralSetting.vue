<template>
  <div class="modal__general">
    <NForm
      ref="formRef"
      label-placement="left"
      :label-width="110"
    >
      <NDivider title-placement="left">
        {{ $t('setting.mainLabel') }}
      </NDivider>
      <NFormItem :label="$t('setting.lastSyncTime')">
        <p>{{ syncTime }}</p>
      </NFormItem>
      <NFormItem :label="$t('setting.importSettings')">
        <input type="file" @change="onImportFileChange" />
      </NFormItem>
      <NFormItem :label="$t('setting.exportSettings')">
        <NButton class="item__btn" @click="exportSetting()">
          {{ $t('setting.exportSettings') }}
        </NButton>
      </NFormItem>
      <NDivider title-placement="left">
        {{ $t('setting.language') }}
      </NDivider>
      <NFormItem :label="$t('setting.language')">
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

const onChangeLocale = (locale) => {
  proxy.$i18n.locale = locale
  globalState.setting.general.localLanguage = locale
}

const syncTime = computed(() => {
  return dayjs(globalState.setting.lastSyncTimestamp).format('YYYY-MM-DD HH:mm:ss')
})

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
