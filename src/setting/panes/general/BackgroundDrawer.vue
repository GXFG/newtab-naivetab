<script setup lang="ts">
import { useVirtualList } from '@vueuse/core'
import { Icon } from '@iconify/vue'
import NTSwitch from '@/components/ui/NTSwitch.vue'
import NTTabs from '@/components/ui/NTTabs.vue'
import NTTabsPane from '@/components/ui/NTTabsPane.vue'
import NTDrawer from '@/components/ui/NTDrawer.vue'
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

/** NTDrawer 双向绑定桥梁：ref 同步 props.show，关闭时 emit */
const drawerOpen = ref(props.show)
watch(
  () => props.show,
  (val) => {
    drawerOpen.value = val
  },
)
watch(drawerOpen, (val) => {
  if (!val) onCloseModal()
})

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

const tabSources = computed(() => Object.keys(previewImageListMap.value))
const activeTabSource = ref(tabSources.value[0] || '')

// 同步 activeTabSource：当 previewImageListMap 首次加载完成时自动选中第一个 tab
watch(tabSources, (sources) => {
  if (sources.length > 0 && !activeTabSource.value) {
    activeTabSource.value = sources[0]
  }
})

const activeChunkedList = computed(() => {
  return chunkedPreviewMap.value[activeTabSource.value] ?? []
})

const {
  list: virtualRows,
  containerProps,
  wrapperProps,
  scrollTo,
} = useVirtualList(activeChunkedList, { itemHeight: 110 })

// 切换 tab 时滚动回顶部
watch(activeTabSource, () => {
  scrollTo(0)
})

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
  <NTDrawer
    v-model:open="drawerOpen"
    :width="SECOND_MODAL_WIDTH"
    :height="350"
    :placement="localConfig.general.drawerPlacement"
    :title="$t('generalSetting.selectBackgroundImageLabel')"
    closable
  >
    <div class="drawer__content">
      <!-- current -->
      <SettingFormSection
        :title="$t('keyboardCommon.backgroundPicker')"
        :icon="ICONS.imageSquare"
      >
        <!-- origin -->
        <SettingFormItem :label="$t('common.origin')">
          <NTRadioGroup
            v-model:value="localConfig.general.backgroundImageSource"
            direction="horizontal"
          >
            <NTRadio
              v-for="item in backgroundImageSourceList"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </NTRadio>
          </NTRadioGroup>
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
            <NTButton
              type="primary"
              size="tiny"
              variant="secondary"
              @click="onSelectBackgroundImage"
            >
              <Icon :icon="ICONS.importFile" />
              {{ $t('common.import') }}
            </NTButton>
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
            <NTSwitch
              v-model:value="
                localConfig.general.isBackgroundImageCustomUrlEnabled
              "
              @update:value="handleCustomUrlUpdate"
            />
          </SettingFormItem>
          <SettingFormItem
            v-if="localConfig.general.isBackgroundImageCustomUrlEnabled"
            label="URL"
          >
            <!-- URL 协议前缀为通用格式，无需 i18n -->
            <NTInput
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
          <NTSwitch
            v-model:value="localConfig.general.backgroundImageHighQuality"
          />
        </SettingFormItem>

        <!-- 当前背景图 -->
        <SettingFormItem
          :label="$t('generalSetting.currentBackgroundImageLabel')"
        >
          <div class="current__image">
            <BackgroundDrawerImageElement
              :loading="isImageLoading"
              :lazy="false"
              :data="{
                url: currentBackgroundPreviewUrl,
              }"
            />
          </div>
        </SettingFormItem>
      </SettingFormSection>

      <!-- list 仅来源为网络 且 非定制Url时展示 -->
      <NTSpin
        v-if="
          localConfig.general.backgroundImageSource ===
            BACKGROUND_IMAGE_SOURCE.NETWORK &&
          !localConfig.general.isBackgroundImageCustomUrlEnabled
        "
        :show="isImageGalleryLoading"
        class="image-list__spin"
      >
        <NTTabs
          v-model:value="activeTabSource"
          animated
        >
          <NTTabsPane
            v-for="source of tabSources"
            :key="source"
            :tab="$t(`common.${source}`)"
            :name="source"
          />
        </NTTabs>

        <div
          v-bind="containerProps"
          class="picker__images"
        >
          <div v-bind="wrapperProps">
            <div
              v-for="{ data: row } in virtualRows"
              :key="row.key"
            >
              <div
                v-if="row.isLoadMore"
                class="pexels__load-more"
              >
                <NTButton
                  type="primary"
                  size="tiny"
                  variant="secondary"
                  round
                  :loading="isPexelsLoadingMore"
                  :disabled="(imageLocalState.pexels.currentPage || 1) > 100"
                  @click="loadMorePexels"
                >
                  <Icon :icon="ICONS.add" />
                  {{
                    (imageLocalState.pexels.currentPage || 1) > 100
                      ? $t('common.loaded')
                      : $t('common.loadMore')
                  }}
                </NTButton>
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
                    :delete="activeTabSource === 'favorite'"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </NTSpin>
    </div>
  </NTDrawer>
</template>

<style>
.drawer__content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 15px;

  .reka-tabs {
    display: flex;
    flex-direction: column;
    height: 100%;

    .reka-tabs__list {
      position: sticky;
      top: -17px;
      z-index: 1;
      background-color: var(--nt-gray-minimal);
      flex-shrink: 0;
    }

    .reka-tabs__panels {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  }

  .form__local {
    display: flex;
    align-items: center;
    gap: 8px;

    .local__filename {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      flex: 1;
      padding: 3px 10px;
      border-radius: 5px;
      background-color: var(--nt-gray-minimal);
      border: 1px solid var(--nt-gray-moderate);
      font-size: 12px;
      color: var(--nt-text-tertiary);
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

  .current__image {
    margin-top: 4px;
    width: 150px;
    min-height: 85px;
    border-radius: 6px;
    overflow: hidden;
  }

  .image-list__spin {
    flex: 1;
    margin-top: 4px;
    min-height: 0;
    display: flex;
    flex-direction: column;

    .reka-tabs {
      height: auto;
      flex-shrink: 0;
    }
  }

  .picker__images {
    flex: 1;
    min-height: 0;
    margin-top: 8px;
    overflow: auto;

    .image__row {
      display: flex;
      gap: 8px;
      padding: 4px;
    }
    .image__item {
      flex: 0 0 calc((100% - 16px) / 3);
      aspect-ratio: 16 / 9;
      min-height: 70px;
      overflow: hidden;
      border-radius: 6px;
    }
  }

  .pexels__load-more {
    display: flex;
    justify-content: center;
    padding: 12px 0;
  }
}
</style>
