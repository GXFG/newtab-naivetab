<script setup lang="ts">
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import {
  LOCAL_BACKGROUND_IMAGE_MAX_SIZE_M,
  SECOND_MODAL_WIDTH,
} from '@/logic/constants/app'
import { localConfig, localState } from '@/logic/config/state'
import { useDrawerStack } from '@/composables/useDrawerStack'
import {
  BACKGROUND_IMAGE_SOURCE,
  IMAGE_NETWORK_SOURCE,
} from '@/logic/image/constants'
import {
  imageLocalState,
  imageState,
  isImageLoading,
  isImageGalleryLoading,
} from '@/logic/image/state'
import {
  previewImageListMap,
  updateBingImages,
  updatePexelsImages,
} from '@/logic/image/gallery'
import { showToast } from '@/common/toast'
import { getImageUrlFromName } from '@/logic/image/utils'
import { storeLocalBackgroundImage } from '@/logic/image/service'
import { getPexelsImagesData } from '@/api/image'
import { log } from '@/logic/utils/common'
import { SettingFormItem, SettingFormSection } from '@/setting/components'
import BackgroundDrawerImageElement from './BackgroundDrawerImageElement.vue'

/**
 * 当前背景图的实际预览 URL，根据来源类型动态计算：
 * - LOCAL: 使用 imageState.previewImageUrl（base64 小图，上传时立即设置）
 * - NETWORK + 自定义 URL: 使用用户配置的 URL
 * - NETWORK / BING_PHOTO（非自定义）: 通过 networkSourceType + name 拼接网络 URL
 * 避免来源切换时 previewImageUrl 显示过期图片。
 */
const currentBackgroundPreviewUrl = computed(() => {
  const source = localConfig.general.backgroundImageSource

  // 本地上传：previewImageUrl 由文件选择器直接设置
  if (source === BACKGROUND_IMAGE_SOURCE.LOCAL) {
    return imageState.previewImageUrl
  }

  // 网络来源
  if (source === BACKGROUND_IMAGE_SOURCE.NETWORK) {
    // 自定义 URL 优先
    if (localConfig.general.isBackgroundImageCustomUrlEnabled) {
      return (
        localConfig.general.backgroundImageCustomUrls[
          localState.value.currAppearanceCode
        ] || ''
      )
    }
    // Bing/Pexels 图库：从配置的图片对象拼接 URL
    const config = (localConfig.general.backgroundImageList as any)[
      localState.value.currAppearanceCode
    ]
    if (config?.name) {
      return getImageUrlFromName(config.networkSourceType, config.name)
    }
    return ''
  }

  // 每日一图（Bing）：取今日图片 URL
  if (source === BACKGROUND_IMAGE_SOURCE.BING_PHOTO) {
    const todayImage = imageLocalState.value.bing.list[0]
    if (todayImage?.name) {
      return getImageUrlFromName(IMAGE_NETWORK_SOURCE.BING, todayImage.name)
    }
    return ''
  }

  return ''
})

type ImageRow = {
  items: Array<TImage.BaseImageItem>
  key: string
  isLoadMore?: boolean
}

const chunkArray = (
  arr: Array<TImage.BaseImageItem>,
  size: number,
  appendLoadMore = false,
): Array<ImageRow> => {
  const result: Array<ImageRow> = []
  for (let i = 0; i < arr.length; i += size) {
    result.push({ items: arr.slice(i, i + size), key: `row-${i}` })
  }
  if (appendLoadMore) {
    result.push({ items: [], key: 'load-more', isLoadMore: true })
  }
  return result
}

const chunkedPreviewMap = computed((): Record<string, Array<ImageRow>> => {
  const map: Record<string, Array<ImageRow>> = {}
  for (const source of Object.keys(previewImageListMap.value)) {
    const shouldAppendLoadMore = source === 'pexels'
    map[source] = chunkArray(
      previewImageListMap.value[
        source as keyof typeof previewImageListMap.value
      ] as any,
      3,
      shouldAppendLoadMore,
    )
  }
  return map
})

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
  { label: window.$t('common.local'), value: BACKGROUND_IMAGE_SOURCE.LOCAL },
  {
    label: window.$t('common.network'),
    value: BACKGROUND_IMAGE_SOURCE.NETWORK,
  },
  {
    label: window.$t('generalSetting.photoOfTheDay'),
    value: BACKGROUND_IMAGE_SOURCE.BING_PHOTO,
  },
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

// ESC 逐层关闭支持
useDrawerStack('background-drawer', toRef(props, 'show'), onCloseModal)

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
    showToast.error(window.$t('prompts.imageTooLarge'))
    return
  }
  await storeLocalBackgroundImage(file)
}

/**
 * 强制将自定义图片 URL 转为 https。
 * 这是预期设计而非 BUG：背景图需经过 canvas 压缩处理，http 图片在 https 页面中
 * 会触发 "Tainted canvases may not be exported" 跨域错误，导致压缩失败。
 * 因此用户输入 http:// 时会被自动升级，不支持 http-only 的图床。
 */
const handleCustomUrlStartWithHttps = () => {
  let url =
    localConfig.general.backgroundImageCustomUrls[
      localState.value.currAppearanceCode
    ]
  // 去掉可能的协议前缀后补 https
  url = url.replace(/^https?:\/\//, 'https://')
  // 没有协议前缀时自动补 https://
  if (
    url.length > 0 &&
    !url.startsWith('https://') &&
    !url.startsWith('http://')
  ) {
    url = 'https://' + url
  }
  localConfig.general.backgroundImageCustomUrls[
    localState.value.currAppearanceCode
  ] = url
}

const handleCustomUrlUpdate = () => {
  handleCustomUrlStartWithHttps()
}

const handleBackgroundImageCustomUrlBlur = () => {
  handleCustomUrlStartWithHttps()
  // 当只单独设置了浅色or深色外观的背景时，默认同步另一外观为相同的背景
  if (
    localConfig.general.backgroundImageCustomUrls[
      +!localState.value.currAppearanceCode
    ].length === 0
  ) {
    localConfig.general.backgroundImageCustomUrls[
      +!localState.value.currAppearanceCode
    ] =
      localConfig.general.backgroundImageCustomUrls[
        localState.value.currAppearanceCode
      ]
  }
}

const isPexelsLoadingMore = ref(false)

const loadMorePexels = async () => {
  if (isPexelsLoadingMore.value) return
  const pexels = imageLocalState.value.pexels
  const currentPage = pexels.currentPage || 1
  if (currentPage > 100) return
  isPexelsLoadingMore.value = true
  try {
    const data = await getPexelsImagesData({ page: currentPage, per_page: 80 })
    const newList = data.photos.map((item: TImage.PexelsImageItem) => ({
      name: `${item.id}`,
      desc: `${item.alt} (${item.photographer})`,
    }))
    pexels.list.push(...newList)
    pexels.currentPage = currentPage + 1
  } catch (e) {
    log('loadMorePexels error:', e)
  } finally {
    isPexelsLoadingMore.value = false
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
      :title="$t('generalSetting.selectBackgroundImageLabel')"
      closable
    >
      <div class="drawer__content">
        <!-- current -->
        <div class="content__config-section">
          <div class="content__config">
            <SettingFormSection
              :title="$t('keyboardCommon.backgroundPicker')"
              :icon="ICONS.imageSquare"
            >
              <!-- origin -->
              <SettingFormItem :label="$t('common.origin')">
                <NRadioGroup
                  v-model:value="localConfig.general.backgroundImageSource"
                  size="small"
                  direction="horizontal"
                >
                  <NRadio
                    v-for="item in backgroundImageSourceList"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </NRadio>
                </NRadioGroup>
              </SettingFormItem>

              <!-- local -->
              <SettingFormItem
                v-if="
                  localConfig.general.backgroundImageSource ===
                  BACKGROUND_IMAGE_SOURCE.LOCAL
                "
                :label="$t('common.select')"
                :tip-content="$t('generalSetting.localBackgroundTips')"
              >
                <div class="form__local">
                  <p
                    v-if="imageState.currBackgroundImageFileName"
                    class="local__filename"
                  >
                    <Icon
                      :icon="ICONS.imageSquare"
                      class="filename__icon"
                    />
                    <span class="filename__text">
                      {{ imageState.currBackgroundImageFileName }}
                    </span>
                  </p>
                  <NButton
                    type="primary"
                    size="tiny"
                    secondary
                    class="setting__btn setting__btn--primary"
                    @click="onSelectBackgroundImage"
                  >
                    <template #icon>
                      <Icon :icon="ICONS.importFile" />
                    </template>
                    {{ $t('common.import') }}
                  </NButton>
                  <input
                    ref="bgImageFileInputEl"
                    style="display: none"
                    type="file"
                    accept="image/*"
                    @change="onBackgroundImageFileChange"
                  />
                </div>
              </SettingFormItem>

              <!-- network -->
              <template
                v-else-if="
                  localConfig.general.backgroundImageSource ===
                  BACKGROUND_IMAGE_SOURCE.NETWORK
                "
              >
                <SettingFormItem :label="$t('common.custom')">
                  <NSwitch
                    v-model:value="
                      localConfig.general.isBackgroundImageCustomUrlEnabled
                    "
                    size="small"
                    @update:value="handleCustomUrlUpdate"
                  />
                </SettingFormItem>
                <SettingFormItem
                  v-if="localConfig.general.isBackgroundImageCustomUrlEnabled"
                  label="URL"
                >
                  <!-- URL 协议前缀为通用格式，无需 i18n -->
                  <NInput
                    v-model:value="
                      localConfig.general.backgroundImageCustomUrls[
                        localState.currAppearanceCode
                      ]
                    "
                    class="setting__fill-input"
                    type="text"
                    placeholder="https://"
                    @blur="handleBackgroundImageCustomUrlBlur"
                  />
                </SettingFormItem>
              </template>
              <!-- 网络（未开启自定义），每日一图时展示 -->
              <SettingFormItem
                v-if="
                  localConfig.general.backgroundImageSource !==
                    BACKGROUND_IMAGE_SOURCE.LOCAL &&
                  !localConfig.general.isBackgroundImageCustomUrlEnabled
                "
                :label="$t('common.uhd')"
              >
                <NSwitch
                  v-model:value="localConfig.general.backgroundImageHighQuality"
                  size="small"
                />
              </SettingFormItem>

              <!-- 当前背景图 -->
              <SettingFormItem
                :label="$t('generalSetting.currentBackgroundImageLabel')"
              >
                <div class="current__image">
                  <NSpin :show="isImageLoading">
                    <BackgroundDrawerImageElement
                      :lazy="false"
                      :data="{
                        url: currentBackgroundPreviewUrl,
                      }"
                    />
                  </NSpin>
                </div>
              </SettingFormItem>
            </SettingFormSection>
          </div>
        </div>

        <!-- list 仅来源为网络 且 非定制Url时展示 -->
        <NSpin
          v-if="
            localConfig.general.backgroundImageSource ===
              BACKGROUND_IMAGE_SOURCE.NETWORK &&
            !localConfig.general.isBackgroundImageCustomUrlEnabled
          "
          :show="isImageGalleryLoading"
          class="image-list__spin"
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
              <div class="tab__wrap">
                <RecycleScroller
                  v-slot="{ item: row }"
                  class="picker__images"
                  :items="chunkedPreviewMap[source]"
                  :item-size="100"
                  key-field="key"
                >
                  <div
                    v-if="row.isLoadMore"
                    class="pexels__load-more"
                  >
                    <NButton
                      size="tiny"
                      round
                      :loading="isPexelsLoadingMore"
                      :disabled="
                        (imageLocalState.pexels.currentPage || 1) > 100
                      "
                      @click="loadMorePexels"
                    >
                      {{
                        (imageLocalState.pexels.currentPage || 1) > 100
                          ? $t('common.loaded')
                          : $t('common.loadMore')
                      }}
                    </NButton>
                  </div>
                  <div
                    v-else
                    class="image__row"
                  >
                    <div
                      v-for="(item, colIdx) in row.items"
                      :key="`${row.key}-${item.name}-${colIdx}`"
                      class="image__item"
                    >
                      <BackgroundDrawerImageElement
                        :data="item"
                        select
                        :delete="source === 'favorite'"
                      />
                    </div>
                  </div>
                </RecycleScroller>
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
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .n-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;

    .n-tabs-nav {
      position: sticky;
      top: -17px;
      z-index: 1;
      background-color: var(--n-tab-color-segment);
      flex-shrink: 0;
    }

    .n-tabs-pane-wrapper {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  }

  .content__config-section {
    display: flex;
  }

  .form__local {
    display: flex;
    align-items: center;
    gap: 8px;

    .setting__btn {
      flex-shrink: 0;
    }

    .local__filename {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      flex: 1;
      padding: 5px 10px;
      border-radius: 5px;
      background-color: var(--n-color-target);
      border: 1px solid var(--n-border-color);
      font-size: 12px;
      color: var(--n-text-color-3);
      margin: 0;
      overflow: hidden;

      .filename__text {
        min-width: 0;
        line-height: 1.2;
      }

      .filename__icon {
        flex-shrink: 0;
        font-size: 14px;
        opacity: 0.6;
      }
    }
  }

  .content__config {
    margin-right: 18px;
    flex: 1;
  }

  .current__image {
    margin-top: 4px;
    width: 200px;
    min-height: 92px;
    border-radius: 6px;
    overflow: hidden;
  }

  .image-list__spin {
    flex: 1;
    margin-top: 4px;
    min-height: 0;
    height: 0;

    .n-spin-content {
      height: 100%;
    }
  }

  .picker__images {
    /* 这里必须指定高度 */
    height: calc(100vh - 320px);
    .vue-recycle-scroller__item-view {
      padding: 4px;
    }
    .image__row {
      display: flex;
      gap: 8px;
    }
    .image__item {
      flex: 0 0 calc((100% - 16px) / 3);
      aspect-ratio: 16 / 9;
      min-height: 70px;
    }
  }

  .tab__wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .pexels__load-more {
    display: flex;
    justify-content: center;
    padding: 12px 0;
  }
}
</style>
