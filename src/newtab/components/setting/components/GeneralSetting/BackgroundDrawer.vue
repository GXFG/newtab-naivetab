<script setup lang="ts">
import BackgroundDrawerImageElement from './BackgroundDrawerImageElement.vue'
import {
  LOCAL_BACKGROUND_IMAGE_MAX_SIZE_M,
  SECOND_MODAL_WIDTH,
  databaseStore,
  previewImageListMap,
  localConfig,
  localState,
  imageState,
  isImageLoading,
  isImageListLoading,
  updateImages,
  compressedImageUrlToBase64,
} from '@/logic'

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

const backgroundImageSourceList = computed(() => [
  { label: window.$t('common.local'), value: 0 },
  { label: window.$t('common.network'), value: 1 },
  { label: window.$t('form.photoOfTheDay'), value: 2 },
])

watch(
  () => props.show,
  (value: boolean) => {
    if (value) {
      updateImages()
    }
  },
)

const currImageData = computed(() => {
  if (!(localConfig.general.backgroundImageSource === 1 && !localConfig.general.isBackgroundImageCustomUrlEnabled)) {
    // not from Bing url
    return {
      url: imageState.currBackgroundImageFileObjectURL,
      name: '',
      desc: '',
    }
  }
  return {
    url: '',
    name: localConfig.general.backgroundImageNames[localState.value.currAppearanceCode],
    desc: localConfig.general.backgroundImageDescs[localState.value.currAppearanceCode],
  }
})

const bgImageFileInputEl = ref()

const onSelectBackgroundImage = () => {
  (bgImageFileInputEl as any).value.value = null
  bgImageFileInputEl.value.click()
}

const onBackgroundImageFileChange = async (e: Event) => {
  const file = (e.target as any).files[0]
  if (file.size > LOCAL_BACKGROUND_IMAGE_MAX_SIZE_M * 1024 * 1024) {
    window.$message.error(window.$t('prompts.imageTooLarge'))
    return
  }
  const imageUrl = URL.createObjectURL(file)
  imageState.currBackgroundImageFileName = file.name
  imageState.currBackgroundImageFileObjectURL = imageUrl
  const smallBase64 = await compressedImageUrlToBase64(imageUrl)
  localStorage.setItem('l-firstScreen', smallBase64)
  // store DB
  let handleType: DatabaseHandleType = 'add'
  const currAppearanceImage = await databaseStore('localBackgroundImages', 'get', localState.value.currAppearanceCode)
  if (currAppearanceImage) {
    handleType = 'put' // 更新，第一次使用add，后续修改使用put
  }
  databaseStore('localBackgroundImages', handleType, {
    appearanceCode: localState.value.currAppearanceCode,
    file,
    smallBase64,
  })
  // 当只单独设置了浅色or深色外观的背景时，默认同步另一外观为相同的背景
  const oppositeAppearanceImage = await databaseStore('localBackgroundImages', 'get', +!localState.value.currAppearanceCode)
  if (oppositeAppearanceImage) {
    return
  }
  databaseStore('localBackgroundImages', 'add', {
    appearanceCode: +!localState.value.currAppearanceCode,
    file,
    smallBase64,
  })
}

// 确保协议为https，否则会导致报错 Tainted canvases may not be exported
const handleCustomUrlStartWithHttps = () => {
  const httpsUrl = localConfig.general.backgroundImageCustomUrls[localState.value.currAppearanceCode].replace('http://', 'https://')
  localConfig.general.backgroundImageCustomUrls[localState.value.currAppearanceCode] = httpsUrl
}

const handleCustomUrlUpdate = () => {
  handleCustomUrlStartWithHttps()
}

const handleBackgroundImageCustomUrlBlur = () => {
  handleCustomUrlStartWithHttps()
  // 当只单独设置了浅色or深色外观的背景时，默认同步另一外观为相同的背景
  if (localConfig.general.backgroundImageCustomUrls[+!localState.value.currAppearanceCode].length === 0) {
    localConfig.general.backgroundImageCustomUrls[+!localState.value.currAppearanceCode]
      = localConfig.general.backgroundImageCustomUrls[localState.value.currAppearanceCode]
  }
}
</script>

<template>
  <!-- BackgroundDrawer: bing & favorite -->
  <NDrawer
    :show="props.show"
    :width="SECOND_MODAL_WIDTH"
    :height="350"
    :placement="localConfig.general.drawerPlacement"
    to="#background__drawer"
    @update:show="onCloseModal()"
  >
    <NDrawerContent :title="`${$t('common.edit')}${$t('common.backgroundImage')}`" closable>
      <div class="drawer__content">
        <!-- current -->
        <div>
          <NForm class="content__config" label-placement="left" :label-width="100">
            <NFormItem :label="$t('common.origin')">
              <NSelect v-model:value="localConfig.general.backgroundImageSource" :options="backgroundImageSourceList" />
            </NFormItem>
            <!-- local -->
            <input ref="bgImageFileInputEl" style="display: none" type="file" accept="image/*" @change="onBackgroundImageFileChange">
            <NFormItem v-if="localConfig.general.backgroundImageSource === 0" :label="$t('common.select')">
              <NButton class="setting__row-element" @click="onSelectBackgroundImage">
                <uil:import />&nbsp;{{ $t('common.import') }}
              </NButton>
              <Tips :content="$t('general.localBackgroundTips')" />
              <p class="setting__row-element">
                {{ imageState.currBackgroundImageFileName }}
              </p>
            </NFormItem>
            <!-- network -->
            <template v-else-if="localConfig.general.backgroundImageSource === 1">
              <NFormItem :label="$t('common.custom')">
                <NSwitch v-model:value="localConfig.general.isBackgroundImageCustomUrlEnabled" @update:value="handleCustomUrlUpdate" />
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
              <NSpin :show="isImageLoading">
                <BackgroundDrawerImageElement :lazy="false" :data="currImageData" />
              </NSpin>
            </div>
          </div>
          <NForm class="content__config" label-placement="left" :label-width="100">
            <NFormItem
              v-if="localConfig.general.backgroundImageSource !== 0 && !localConfig.general.isBackgroundImageCustomUrlEnabled"
              :label="$t('common.uhd')"
            >
              <NSwitch v-model:value="localConfig.general.backgroundImageHighQuality" />
            </NFormItem>
          </NForm>
        </div>
        <!-- list 仅来源为网络时展示 -->
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

<style scoped>
.drawer__content {
  .content__config {
    margin-right: 18px;
    flex: 1;
  }
  .current__label {
    margin-bottom: 5px;
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
