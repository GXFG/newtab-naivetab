<script setup lang="ts">
import { FAVORITE_IMAGE_MAX_COUNT } from '@/logic/constants/app'
import { createTab } from '@/logic/utils/common'
import { downloadImageByUrl } from '@/logic/image/utils'
import { showToast } from '@/common/toast'
import { localConfig, localState } from '@/logic/config/state'
import { customPrimaryColor, colorMixWithAlpha } from '@/logic/store/style'
import { isImageLoading } from '@/logic/image/state'
import { getImageUrlFromName } from '@/logic/image/utils'
import { IMAGE_NETWORK_SOURCE } from '@/logic/image/constants'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'

const props = defineProps({
  data: {
    type: Object as () => {
      url?: string // 存在url时优先使用url，忽略name
      networkSourceType?: (typeof IMAGE_NETWORK_SOURCE)[keyof typeof IMAGE_NETWORK_SOURCE] // IMAGE_NETWORK_SOURCE.BING | IMAGE_NETWORK_SOURCE.PEXELS
      name?: string
      desc?: string
    },
    required: true,
  },
  lazy: {
    type: Boolean,
    default: true,
  },
  select: {
    type: Boolean,
    default: false,
  },
  delete: {
    type: Boolean,
    default: false,
  },
})

const hasImage = computed(
  () =>
    (props.data.url && props.data.url.length !== 0) ||
    (props.data.name && props.data.name.length !== 0),
)

const isToolbarVisible = computed(
  () => props.data.name && props.data.name.length !== 0,
)

const currImageUrl = computed(() => {
  if (props.data.url?.length) return props.data.url
  if (props.data.networkSourceType && props.data.name) {
    return getImageUrlFromName(props.data.networkSourceType, props.data.name)
  }
  return ''
})

const isImageError = ref(false)

const onImageError = () => {
  isImageError.value = true
}

watch(currImageUrl, () => {
  isImageError.value = false
})

const isCurrSelectedImage = computed(() => {
  if (!props.select) {
    return false
  }
  const config = (localConfig.general.backgroundImageList as any)[
    localState.value.currAppearanceCode
  ]
  return props.data.name === config?.name
})

const onSelectImage = () => {
  if (!props.select) {
    return
  }
  // 避免快速切换背景图导致的加载顺序错乱
  if (isImageLoading.value) {
    return
  }
  ;(localConfig.general.backgroundImageList as any)[
    localState.value.currAppearanceCode
  ] = {
    networkSourceType: props.data.networkSourceType,
    name: props.data.name || '',
  }
}

const getOriginalImageUrl = () => {
  if (props.data.url?.length) return props.data.url
  if (props.data.networkSourceType && props.data.name) {
    return getImageUrlFromName(
      props.data.networkSourceType,
      props.data.name,
      'high',
    )
  }
  return ''
}

const onViewImage = () => {
  const url = getOriginalImageUrl()
  createTab(url)
}

const onSaveImage = () => {
  const url = getOriginalImageUrl()
  if (!url) return
  downloadImageByUrl(url, props.data.name)
}

const favoriteImageNameSet = computed(
  () => new Set(localConfig.general.favoriteImageList.map((item) => item.name)),
)

const isFavoriteIconVisible = computed(() => {
  return !favoriteImageNameSet.value.has(props.data.name || '')
})

const onFavoriteImage = () => {
  if (
    localConfig.general.favoriteImageList.length >= FAVORITE_IMAGE_MAX_COUNT
  ) {
    showToast.error(window.$t('prompts.favoriteLimit'))
    return
  }
  if (!props.data.networkSourceType) {
    console.warn('networkSourceType is null')
    return
  }
  localConfig.general.favoriteImageList.push({
    networkSourceType: props.data.networkSourceType,
    name: props.data.name || '',
  })
  showToast.success(
    `${window.$t('common.favorite')}${window.$t('common.success')}`,
  )
}

const onUnFavoriteImage = () => {
  const index = localConfig.general.favoriteImageList.findIndex(
    (item) => item.name === props.data.name,
  )
  if (index === -1) return
  localConfig.general.favoriteImageList.splice(index, 1)
}

const ntBgDrawerOutlineMix = computed(() =>
  colorMixWithAlpha(customPrimaryColor.value, 0.22),
)

const cssVars = computed(() => ({
  '--nt-bg-drawer-color': customPrimaryColor.value,
  '--nt-bg-drawer-outline-mix': ntBgDrawerOutlineMix.value,
}))
</script>

<template>
  <div
    class="image__wrap"
    :class="{ 'image__wrap--active': isCurrSelectedImage }"
    :style="cssVars"
  >
    <NSpin :show="isCurrSelectedImage && isImageLoading">
      <div
        v-if="!hasImage || isImageError"
        class="image__empty"
      >
        <Icon :icon="ICONS.imageSquare" />
        <span class="image__empty-text">{{
          isImageError
            ? $t('prompts.imageLoadFailed')
            : $t('prompts.noImageAvailable')
        }}</span>
      </div>

      <!-- 懒加载的img不支持reactive变量 -->
      <img
        v-else-if="lazy"
        v-lazy="currImageUrl"
        alt=""
        @error="onImageError"
        @click="onSelectImage()"
      />
      <img
        v-else
        :src="currImageUrl"
        alt=""
        @error="onImageError"
        @click="onSelectImage()"
      />
    </NSpin>

    <div
      v-if="isCurrSelectedImage"
      class="image__current-mask"
    >
      <div class="check__icon">
        <Icon :icon="ICONS.checkCircle" />
      </div>
    </div>

    <!-- toolbar -->
    <div
      v-if="isToolbarVisible"
      class="image__toolbar"
    >
      <NPopover
        v-if="props.data.desc && props.data.desc.length !== 0"
        trigger="hover"
        placement="top"
      >
        <template #trigger>
          <div class="toolbar__icon">
            <Icon :icon="ICONS.info" />
          </div>
        </template>
        <p class="toolbar__desc">{{ props.data.desc }}</p>
      </NPopover>

      <div
        class="toolbar__icon"
        @click="onViewImage()"
      >
        <Icon :icon="ICONS.zoomIn" />
      </div>

      <div
        class="toolbar__icon"
        @click="onSaveImage()"
      >
        <Icon :icon="ICONS.downloadFill" />
      </div>

      <div
        v-if="isFavoriteIconVisible"
        class="toolbar__icon"
        @click="onFavoriteImage()"
      >
        <Icon :icon="ICONS.favorite" />
      </div>

      <!-- delete -->
      <NPopconfirm
        v-if="props.delete"
        @positive-click="onUnFavoriteImage()"
      >
        <template #trigger>
          <div class="toolbar__icon toolbar__icon--danger">
            <Icon :icon="ICONS.deleteBin" />
          </div>
        </template>
        {{ $t('common.confirm') }}?
      </NPopconfirm>
    </div>
  </div>
</template>

<style scoped>
.image__wrap {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  outline: 1.5px solid transparent;
  background-color: var(--n-color-target);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition:
    outline 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
    outline: 1.5px solid var(--gray-alpha-35);

    .image__toolbar {
      opacity: 1;
      transform: translateY(0);
    }
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  &:hover img {
    transform: scale(1.04);
  }

  .image__empty {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 100%;
    min-height: 89px;
    color: var(--n-placeholder-color);
    font-size: 32px;
  }

  .image__empty-text {
    font-size: 11px;
    opacity: 0.6;
    letter-spacing: 0.02em;
  }

  .image__toolbar {
    z-index: 2;
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    height: 28px;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.68) 0%,
      rgba(0, 0, 0, 0) 100%
    );
    padding: 0 4px;
    opacity: 0;
    transform: translateY(6px);
    transition:
      opacity 0.22s ease,
      transform 0.22s ease;

    .toolbar__icon {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.92);
      font-size: 13px;
      transition:
        background-color 0.15s ease,
        color 0.15s ease,
        transform 0.15s ease;

      &:hover {
        background-color: rgba(255, 255, 255, 0.18);
        transform: scale(1.12);
      }

      &.toolbar__icon--danger:hover {
        background-color: rgba(255, 80, 80, 0.28);
        color: #ff8080;
      }
    }
  }

  .image__current-mask {
    z-index: 0;
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle,
      rgba(0, 0, 0, 0.15) 0%,
      rgba(0, 0, 0, 0.38) 100%
    );

    .check__icon {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 28px;
      background-color: rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(4px);
      color: var(--nt-bg-drawer-color);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
    }
  }
}

.image__wrap--active {
  outline: 2px solid var(--nt-bg-drawer-color) !important;
  box-shadow: 0 0 0 4px var(--nt-bg-drawer-outline-mix);
}

.toolbar__desc {
  max-width: 240px;
  font-size: 12px;
  line-height: 1.5;
}
</style>
