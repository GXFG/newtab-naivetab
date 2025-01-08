<script setup lang="ts">
import { LOCAL_BACKGROUND_IMAGE_MAX_SIZE_M, SECOND_MODAL_WIDTH } from '@/logic/const'
import { databaseStore } from '@/logic/database'
import { compressedImageUrlToBase64 } from '@/logic/util'
import { localConfig, localState } from '@/logic/store'
import { previewImageListMap, imageState, isImageLoading, isImageListLoading, updateBingImages, updatePexelsImages } from '@/logic/image'
import Tips from '@/newtab/components/form/Tips.vue'
import BackgroundDrawerImageElement from './BackgroundDrawerImageElement.vue'

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
      updateBingImages()
      updatePexelsImages()
    }
  },
)

const bgImageFileInputEl: Ref<HTMLInputElement | null> = ref(null)

const onSelectBackgroundImage = () => {
  if (!bgImageFileInputEl.value) {
    return
  }
  bgImageFileInputEl.value.value = ''
  bgImageFileInputEl.value.click()
}

const onBackgroundImageFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length <= 0) {
    return
  }
  const file = input.files[0]
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
    localConfig.general.backgroundImageCustomUrls[+!localState.value.currAppearanceCode] = localConfig.general.backgroundImageCustomUrls[localState.value.currAppearanceCode]
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
    show-mask="transparent"
    to="#background__drawer"
    @update:show="onCloseModal()"
  >
    <NDrawerContent
      :title="`${$t('common.select')}${$t('common.backgroundImage')}`"
      closable
    >
      <div class="drawer__content">
        <!-- current -->
        <div>
          <NForm
            class="content__config"
            label-placement="left"
            :label-width="100"
            :show-feedback="false"
          >
            <NFormItem :label="$t('common.origin')">
              <NRadioGroup
                v-model:value="localConfig.general.backgroundImageSource"
                size="small"
                style="width: 100%"
              >
                <NRadioButton
                  v-for="item in backgroundImageSourceList"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </NRadioButton>
              </NRadioGroup>
            </NFormItem>

            <!-- local -->
            <NFormItem
              v-if="localConfig.general.backgroundImageSource === 0"
              :label="$t('common.select')"
            >
              <div class="form__local">
                <div>
                  <NButton
                    type="primary"
                    size="small"
                    ghost
                    style="margin-top: 3px"
                    @click="onSelectBackgroundImage"
                  >
                    <uil:import />&nbsp;{{ $t('common.import') }}
                  </NButton>
                  <Tips :content="$t('general.localBackgroundTips')" />
                </div>
                <p class="local__filename">
                  {{ imageState.currBackgroundImageFileName }}
                </p>
                <input
                  ref="bgImageFileInputEl"
                  style="display: none"
                  type="file"
                  accept="image/*"
                  @change="onBackgroundImageFileChange"
                />
              </div>
            </NFormItem>

            <!-- network -->
            <template v-else-if="localConfig.general.backgroundImageSource === 1">
              <NFormItem :label="`${$t('common.custom')}`">
                <NSwitch
                  v-model:value="localConfig.general.isBackgroundImageCustomUrlEnabled"
                  size="small"
                  @update:value="handleCustomUrlUpdate"
                />
              </NFormItem>
              <NFormItem
                v-if="localConfig.general.isBackgroundImageCustomUrlEnabled"
                label="URL"
              >
                <NInput
                  v-model:value="localConfig.general.backgroundImageCustomUrls[localState.currAppearanceCode]"
                  class="setting__item-element"
                  type="text"
                  placeholder="https://"
                  @blur="handleBackgroundImageCustomUrlBlur"
                />
              </NFormItem>
            </template>
            <!-- 网络（未开启自定义），每日一图时展示 -->
            <NFormItem
              v-if="localConfig.general.backgroundImageSource !== 0 && !localConfig.general.isBackgroundImageCustomUrlEnabled"
              :label="$t('common.uhd')"
            >
              <NSwitch
                v-model:value="localConfig.general.backgroundImageHighQuality"
                size="small"
              />
            </NFormItem>

            <!-- 当前背景图 -->
            <NFormItem :label="`${$t('common.current')}${$t('common.backgroundImage')}`">
              <div class="current__image">
                <NSpin :show="isImageLoading">
                  <BackgroundDrawerImageElement
                    :lazy="false"
                    :data="{
                      url: imageState.currBackgroundImageFileObjectURL,
                    }"
                  />
                </NSpin>
              </div>
            </NFormItem>
          </NForm>
        </div>

        <!-- list 仅来源为网络 且 非定制Url时展示 -->
        <NSpin
          v-if="localConfig.general.backgroundImageSource === 1 && !localConfig.general.isBackgroundImageCustomUrlEnabled"
          :show="isImageListLoading"
        >
          <NTabs
            type="line"
            animated
          >
            <NTabPane
              v-for="source of Object.keys(previewImageListMap)"
              :key="source"
              :tab="$t(`common.${source}`)"
              :name="source"
            >
              <div class="picker__images">
                <div
                  v-for="item in previewImageListMap[source]"
                  :key="item.name"
                  class="image__item"
                >
                  <BackgroundDrawerImageElement
                    :data="item"
                    select
                    :delete="source === 'favorite'"
                  />
                </div>
              </div>
            </NTabPane>
          </NTabs>
        </NSpin>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style>
.drawer__content {
  .n-tabs .n-tabs-nav {
    position: sticky;
    top: -10px;
    z-index: 1;
    background-color: var(--n-tab-color-segment);
  }
  .form__local {
    display: flex;
    flex-direction: column;
    .local__filename {
      margin-top: 8px;
      width: 400px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
  .content__config {
    margin-right: 18px;
    flex: 1;
  }
  .current__label {
    margin-bottom: -10px;
    color: var(--n-label-text-color);
  }
  .current__image {
    margin-top: 10px;
    width: 200px;
    min-height: 92px;
  }
  .picker__images {
    display: flex;
    flex-wrap: wrap;
    .image__item {
      flex: 0 0 auto;
      margin: 1.6%;
      width: 30%;
      min-height: 89px;
    }
  }
}
</style>
