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
  isImageListLoading,
  currBackgroundImageUrl,
  updateImages,
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

const state = reactive({
  lastAppearance: localConfig.general.appearance, // 记录当前设置的外观，用于关闭抽屉时恢复
  applyToAppearance: localState.value.currAppearanceLabel,
})

watch(
  () => props.show,
  (value: boolean) => {
    if (value) {
      updateImages()
      state.lastAppearance = localConfig.general.appearance
      state.applyToAppearance = localState.value.currAppearanceLabel
    } else {
      localConfig.general.appearance = state.lastAppearance
    }
  },
)

const handleAppearanceChange = (value: 'light' | 'dark') => {
  localConfig.general.appearance = value
}

const currImageData = computed(() => {
  let data: any = {
    name: localConfig.general.backgroundImageNames[localState.value.currAppearanceCode],
    desc: localConfig.general.backgroundImageDescs[localState.value.currAppearanceCode],
  }
  if (!(localConfig.general.backgroundImageSource === 1 && !localConfig.general.isBackgroundImageCustomUrlEnabled)) {
    // not from Bing url
    data = { url: currBackgroundImageUrl.value }
  }
  return data
})

const bgImageFileInputEl = ref()

const onSelectBackgroundImage = () => {
  (bgImageFileInputEl as any).value.value = null
  bgImageFileInputEl.value.click()
}

const onBackgroundImageFileChange = async (e: any) => {
  const file = e.target.files[0]
  if (file.size > LOCAL_BACKGROUND_IMAGE_MAX_SIZE_M * 1024 * 1024) {
    window.$message.error(window.$t('prompts.imageTooLarge'))
    return
  }
  imageState.currBackgroundImageFileName = file.name
  imageState.currBackgroundImageFileObjectURL = URL.createObjectURL(file)
  let handleType: DatabaseHandleType = 'add'
  const currAppearanceImage = await databaseStore('localBackgroundImages', 'get', localState.value.currAppearanceCode)
  if (currAppearanceImage) {
    handleType = 'put'
  }
  databaseStore('localBackgroundImages', handleType, {
    appearanceCode: localState.value.currAppearanceCode,
    file,
  })
  // 当只单独设置了浅色or深色外观的背景时，默认同步另一外观为相同的背景
  const oppositeAppearanceImage = await databaseStore('localBackgroundImages', 'get', +!localState.value.currAppearanceCode)
  if (oppositeAppearanceImage) {
    return
  }
  databaseStore('localBackgroundImages', 'add', {
    appearanceCode: +!localState.value.currAppearanceCode,
    file,
  })
}

const handleBackgroundImageCustomUrlBlur = () => {
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
          <NForm class="content__config" label-placement="left" :label-width="80">
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
          <NTabs
            v-if="[0, 1].includes(localConfig.general.backgroundImageSource)"
            type="segment"
            size="small"
            :default-value="state.applyToAppearance"
            @update:value="handleAppearanceChange"
          >
            <NTab name="light">
              {{ $t('common.light') }}
            </NTab>
            <NTab name="dark">
              {{ $t('common.dark') }}
            </NTab>
          </NTabs>
          <div class="current__image">
            <div class="image__content">
              <BackgroundDrawerImageElement :lazy="false" :data="currImageData" />
            </div>
          </div>
          <NForm class="content__config" label-placement="left" :label-width="80">
            <NFormItem
              v-if="localConfig.general.backgroundImageSource !== 0 && !localConfig.general.isBackgroundImageCustomUrlEnabled"
              :label="$t('common.4k')"
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
