<script setup lang="ts">
import { FAVORITE_IMAGE_MAX_COUNT } from '@/logic/constants/index'
import { createTab, downloadImageByUrl } from '@/logic/util'
import { customPrimaryColor, localConfig, localState } from '@/logic/store'
import { isImageLoading, getImageUrlFromName } from '@/logic/image'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'

const props = defineProps({
  data: {
    type: Object as () => {
      url?: string // 存在url时优先使用url，忽略name
      networkSourceType?: 1 | 2 // 1 Bing, 2 Pexels
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

const isHasImage = computed(() => (props.data.url && props.data.url.length !== 0) || (props.data.name && props.data.name.length !== 0))

const isToolbarVisible = computed(() => props.data.name && props.data.name.length !== 0)

const currImageUrl = computed(() => {
  let url = ''
  if (props.data.url && props.data.url.length !== 0) {
    url = props.data.url
  } else if (props.data.networkSourceType && props.data.name) {
    url = getImageUrlFromName(props.data.networkSourceType, props.data.name)
  }
  return url
})

const isCurrSelectedImage = computed(() => {
  if (!props.select) {
    return false
  }
  return props.data.name === localConfig.general.backgroundImageNames[localState.value.currAppearanceCode]
})

const onSelectImage = () => {
  if (!props.select) {
    return
  }
  // 避免快速切换背景图导致的加载顺序错乱
  if (isImageLoading.value) {
    return
  }
  if (props.data.networkSourceType) {
    localConfig.general.backgroundNetworkSourceType = props.data.networkSourceType
  }
  localConfig.general.backgroundImageNames[localState.value.currAppearanceCode] = props.data.name || ''
}

const getOriginalImageUrl = () => {
  let url = ''
  if (props.data.url) {
    url = props.data.url
  } else if (props.data.networkSourceType && props.data.name) {
    url = getImageUrlFromName(props.data.networkSourceType, props.data.name, 'high')
  }
  return url
}

const onViewImage = () => {
  const url = getOriginalImageUrl()
  createTab(url)
}

const onSaveImage = () => {
  const url = getOriginalImageUrl()
  downloadImageByUrl(url, props.data.name)
}

const isFavoriteIconVisible = computed(() => {
  const favoriteBackgroundNameList = localConfig.general.favoriteImageList.map((item) => item.name)
  return !favoriteBackgroundNameList.includes(props.data.name || '')
})

const onFavoriteImage = () => {
  if (localConfig.general.favoriteImageList.length >= FAVORITE_IMAGE_MAX_COUNT) {
    window.$message.error(window.$t('prompts.favoriteLimt'))
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
  window.$message.success(`${window.$t('common.favorite')}${window.$t('common.success')}`)
}

const onUnFavoriteImage = () => {
  const index = localConfig.general.favoriteImageList.findIndex((item) => item.name === props.data.name)
  localConfig.general.favoriteImageList.splice(index, 1)
}
</script>

<template>
  <div
    class="image__wrap"
    :class="{ 'image__wrap--active': isCurrSelectedImage }"
  >
    <NSpin :show="isCurrSelectedImage && isImageLoading">
      <div
        v-if="!isHasImage"
        class="image__empty"
      >
        <Icon :icon="ICONS.imageSquare" />
      </div>

      <!-- 懒加载的img不支持reactive变量 -->
      <img
        v-else-if="lazy"
        v-lazy="currImageUrl"
        alt=""
        @click="onSelectImage()"
      />
      <img
        v-else
        :src="currImageUrl"
        alt=""
        @click="onSelectImage()"
      />
    </NSpin>

    <div
      v-if="isCurrSelectedImage"
      class="image__current-mask"
    >
      <Icon :icon="ICONS.checkCircle" />
    </div>

    <!-- toolbar -->
    <div
      v-if="isToolbarVisible"
      class="image__toolbar"
    >
      <NPopover
        v-if="props.data.desc && props.data.desc.length !== 0"
        trigger="hover"
      >
        <template #trigger>
          <div class="toolbar__icon">
            <Icon :icon="ICONS.info" />
          </div>
        </template>
        <p>{{ props.data.desc }}</p>
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
          <div class="toolbar__icon">
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
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
  outline: 1px solid var(--n-tab-border-color);
  &:hover {
    .image__toolbar {
      bottom: 0 !important;
    }
  }
  .image__empty {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 50px;
  }
  .image__toolbar {
    z-index: 2;
    position: absolute;
    bottom: -20px;
    left: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    height: 20px;
    background-color: rgba(0, 0, 0, 0.5);
    transition: all 0.3s ease;
    .toolbar__icon {
      display: flex;
      justify-content: center;
      align-items: center;
      color: #fff;
      &:hover {
        opacity: 0.7;
      }
    }
  }
  .image__current-mask {
    z-index: 1;
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    font-size: 26px;
    background-color: rgba(0, 0, 0, 0.3);
    color: v-bind(customPrimaryColor);
  }
}
.image__wrap--active {
  outline: 2px solid v-bind(customPrimaryColor);
}
</style>
