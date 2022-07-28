<template>
  <!-- ImagePicker: bing & favorite -->
  <NDrawer :show="props.show" :width="550" @update:show="onCloseModal()">
    <NDrawerContent :title="`${$t('common.edit')}${$t('common.backgroundImage')}`" closable>
      <div class="modal__content">
        <!-- current -->
        <div>
          <NForm class="content__config" label-placement="left" :label-width="80">
            <NFormItem :label="$t('common.origin')">
              <NSelect v-model:value="localConfig.general.backgroundImageSource" :options="backgroundImageSourceList" />
            </NFormItem>
            <NFormItem v-if="localConfig.general.backgroundImageSource === 1" :label="$t('common.appearance')">
              <NSelect v-model:value="localConfig.general.appearance" :options="themeList" />
            </NFormItem>
            <!-- local -->
            <input ref="bgImageFileInputEl" style="display: none" type="file" accept="image/*" @change="onBackgroundImageFileChange">
            <NFormItem v-if="localConfig.general.backgroundImageSource === 0" :label="$t('common.select')">
              <NButton class="setting__row-element" @click="onSelectBackgroundImage">
                <uil:import />&nbsp;{{ $t('common.import') }}
              </NButton>
              <Tips :content="$t('general.localBackgroundTips')" />
              <p class="setting__row-element">
                {{ imageState.localBackgroundFileName }}
              </p>
            </NFormItem>
            <!-- network -->
            <template v-else-if="localConfig.general.backgroundImageSource === 1">
              <NFormItem :label="$t('common.custom')">
                <NSwitch v-model:value="localConfig.general.isBackgroundImageCustomUrlEnabled" />
                <NInput
                  v-if="localConfig.general.isBackgroundImageCustomUrlEnabled"
                  v-model:value="localConfig.general.backgroundImageCustomUrls[localState.currAppearanceCode]"
                  class="setting__row-element"
                  type="text"
                  placeholder="https://"
                  @blur="handleBackgroundImageCustomUrlBlur"
                />
              </NFormItem>
            </template>
          </NForm>
          <p class="current__label">
            {{ `${$t('common.current')}${$t('common.backgroundImage')}` }}
          </p>
          <div class="current__image">
            <div class="image__content">
              <BackgroundDrawerImageElement :lazy="false" :data="currImageData" />
            </div>
          </div>
          <NForm class="content__config" label-placement="left" :label-width="80">
            <NFormItem
              v-if="localConfig.general.backgroundImageSource === 1 && !localConfig.general.isBackgroundImageCustomUrlEnabled"
              :label="$t('common.4k')"
            >
              <NSwitch v-model:value="localConfig.general.backgroundImageHighQuality" />
            </NFormItem>
          </NForm>
        </div>
        <!-- list -->
        <NSpin
          v-if="localConfig.general.backgroundImageSource === 1 && !localConfig.general.isBackgroundImageCustomUrlEnabled"
          :show="isImageListLoading"
        >
          <NCollapse default-expanded-names="bing" accordion>
            <NCollapseItem v-for="origin of Object.keys(previewImageListMap)" :key="origin" :title="$t(`common.${origin}`)" :name="origin">
              <div class="picker__images">
                <div v-for="item in previewImageListMap[origin]" :key="item.name" class="image__item">
                  <BackgroundDrawerImageElement :data="item" select :delete="origin === 'favorite'" />
                </div>
              </div>
            </NCollapseItem>
          </NCollapse>
        </NSpin>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
<script setup lang="ts">
import BackgroundDrawerImageElement from './BackgroundDrawerImageElement.vue'
import { gaEvent, previewImageListMap, localConfig, localState, imageState, isImageListLoading, currBackgroundImageUrl } from '@/logic'
const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:show'])

const onCloseModal = () => {
  emit('update:show', false)
}

const themeList = computed(() => [
  { label: window.$t('common.auto'), value: 'auto' },
  { label: window.$t('common.light'), value: 'light' },
  { label: window.$t('common.dark'), value: 'dark' },
])

const backgroundImageSourceList = computed(() => [
  { label: window.$t('common.local'), value: 0 },
  { label: window.$t('common.network'), value: 1 },
])

const currImageData = computed(() => {
  let data: any = {
    name: localConfig.general.backgroundImageNames[localState.value.currAppearanceCode],
    desc: localConfig.general.backgroundImageDescs[localState.value.currAppearanceCode],
  }
  if (!(localConfig.general.backgroundImageSource === 1 && !localConfig.general.isBackgroundImageCustomUrlEnabled)) {
    // not from Bing
    data = {
      url: currBackgroundImageUrl.value,
    }
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
    const base64Text: any = reader.result
    imageState.value.localBackgroundFileName = file.name
    imageState.value.localBackgroundBase64 = base64Text
  }
  gaEvent('setting-background-image', 'click', 'select-file')
}

const handleBackgroundImageCustomUrlBlur = () => {
  // 当只单独设置了浅色or深色外观的背景时，默认同步另一外观为相同的背景
  if (localConfig.general.backgroundImageCustomUrls[+!localState.value.currAppearanceCode].length === 0) {
    localConfig.general.backgroundImageCustomUrls[+!localState.value.currAppearanceCode]
      = localConfig.general.backgroundImageCustomUrls[localState.value.currAppearanceCode]
  }
}
</script>

<style scoped>
.modal__content {
  height: 88vh;
  .content__config {
    margin-right: 18px;
    flex: 1;
  }
  .current__label {
    color: var(--n-label-text-color);
  }
  .current__image {
    display: flex;
    justify-content: center;
    align-items: center;
    .image__content {
      margin: 2.3%;
      width: 45%;
      min-height: 125px;
    }
  }
  .picker__images {
    display: flex;
    flex-wrap: wrap;
  }
  .image__item {
    flex: 0 0 auto;
    margin: 2.3%;
    width: 45%;
    min-height: 125px;
  }
}
</style>