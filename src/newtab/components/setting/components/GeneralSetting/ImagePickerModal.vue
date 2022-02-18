<template>
  <!-- ImagePicker: bing & favorite -->
  <NModal
    :show="props.show"
    style="width: 700px"
    preset="card"
    :title="`${$t('common.edit')}${$t('common.backgroundImage')}`"
    :mask-closable="true"
    @update:show="onCloseModal()"
  >
    <div class="modal__content">
      <!-- current -->
      <div>
        <p class="current__label">
          {{ `${$t('common.current')}${$t('common.backgroundImage')}` }}
        </p>
        <div class="current__content">
          <div class="image__item">
            <BackgroundImageElement :lazy="false" :data="currImageData" />
          </div>
          <NForm class="content__config" label-placement="left" :label-width="60">
            <input ref="bgImageFileInputEl" style="display: none" type="file" accept="image/*" @change="onBackgroundImageFileChange">
            <NFormItem :label="$t('common.origin')">
              <NSelect
                v-model:value="localState.setting.general.backgroundImageSource"
                :options="backgroundImageSourceList"
                class="setting__row-element"
              />
            </NFormItem>
            <!-- local -->
            <NFormItem v-if="localState.setting.general.backgroundImageSource === 0" :label="$t('common.select')">
              <NButton class="setting__row-element" @click="onSelectBackgroundImage">
                <uil:import />&nbsp;{{ $t('general.importSettingsValue') }}
              </NButton>
              <Tips :content="$t('general.localBackgroundTips')" />
            </NFormItem>
            <NFormItem v-if="isLocalFilenameVisible" :label="$t('general.filename')">
              <p>{{ imageState.localBackgroundFileName }}</p>
            </NFormItem>
            <!-- network -->
            <NFormItem v-else-if="localState.setting.general.backgroundImageSource === 1" :label="$t('common.custom')">
              <NSwitch v-model:value="localState.setting.general.isBackgroundImageCustomUrlEnabled" />
              <NInput
                v-if="localState.setting.general.isBackgroundImageCustomUrlEnabled"
                v-model:value="localState.setting.general.backgroundImageCustomUrl"
                class="setting__row-element custom__input"
                type="text"
                placeholder="https://"
              />
            </NFormItem>
          </NForm>
        </div>
      </div>
      <!-- list -->
      <NSpin :show="isImageListLoading">
        <NCollapse default-expanded-names="bing" accordion>
          <NCollapseItem v-for="origin of Object.keys(previewImageListMap)" :key="origin" :title="$t(`common.${origin}`)" :name="origin">
            <div class="picker__images">
              <div v-for="item in previewImageListMap[origin]" :key="item.name" class="image__item">
                <BackgroundImageElement :data="item" select :delete="origin === 'favorite'" />
              </div>
            </div>
          </NCollapseItem>
        </NCollapse>
      </NSpin>
    </div>
  </NModal>
</template>
<script setup lang="ts">
import { gaEvent, previewImageListMap, localState, imageState, isImageListLoading, currBackgroundImageUrl } from '@/logic'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['close'])

const onCloseModal = () => {
  emit('close')
}

const backgroundImageSourceList = computed(() => [
  { label: window.$t('common.local'), value: 0 },
  { label: window.$t('common.network'), value: 1 },
])

const currImageData = computed(() => {
  const data: any = {
    name: localState.setting.general.backgroundImageName,
    desc: localState.setting.general.backgroundImageDesc,
  }
  if (!(localState.setting.general.backgroundImageSource === 1 && !localState.setting.general.isBackgroundImageCustomUrlEnabled)) {
    // not from bing
    data.url = currBackgroundImageUrl.value
  }
  return data
})

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

const isLocalFilenameVisible = computed(() => {
  return (
    localState.setting.general.isBackgroundImageEnabled
    && localState.setting.general.backgroundImageSource === 0
    && imageState.value.localBackgroundFileName.length !== 0
  )
})
</script>

<style scoped>
.modal__content {
  height: 75vh;
  .current__label {
    opacity: 0.6;
  }
  .current__content {
    display: flex;
    .content__config {
      margin-top: 10px;
      margin-right: 18px;
      flex: 1;
      .custom__input {
        width: 300px;
      }
    }
  }
  .picker__images {
    display: flex;
    flex-wrap: wrap;
  }
  .image__item {
    flex: 0 0 auto;
    margin: 1.5%;
    width: 30%;
    min-height: 110px;
  }
}
</style>
