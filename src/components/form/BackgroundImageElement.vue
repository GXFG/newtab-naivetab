<template>
  <div class="image-wrap" :class="{ 'image-wrap--active': isCurrSelectedImage }">
    <NSpin :show="isCurrSelectedImage && isImageLoading">
      <!-- 懒加载的img不支持reactive变量 -->
      <img v-if="lazy" v-lazy="currImageUrl" alt="" @click="onSelectImage()">
      <img v-else :src="currImageUrl" alt="" @click="onSelectImage()">
    </NSpin>
    <div v-if="isCurrSelectedImage" class="image__current-mask">
      <line-md:confirm-circle />
    </div>
    <div class="image__toolbar">
      <NPopover v-if="props.data.desc && props.data.desc.length !== 0" trigger="hover">
        <template #trigger>
          <div class="toolbar__icon">
            <ic:outline-info />
          </div>
        </template>
        <p>{{ props.data.desc }}</p>
      </NPopover>
      <div class="toolbar__icon" @click="onViewImage()">
        <mdi:eye-circle-outline />
      </div>
      <div class="toolbar__icon" @click="onSaveImage()">
        <ri:download-2-fill />
      </div>
      <div v-if="isFavoriteIconVisible" class="toolbar__icon" @click="onFavoriteImage()">
        <mi:favorite />
      </div>
      <!-- delete -->
      <NPopconfirm v-if="props.delete" @positive-click="onUnFavoriteImage()">
        <template #trigger>
          <div class="toolbar__icon">
            <ri:delete-bin-6-line />
          </div>
        </template>
        {{ $t('common.confirm') }}?
      </NPopconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FAVORITE_MAX_COUNT, getStyleField, createTab, localConfig, downloadImageByUrl, isImageLoading, getBingImageUrlFromName } from '@/logic'

const props = defineProps({
  data: {
    type: Object,
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

const currImageUrl = computed(() => {
  if (props.data.url && props.data.url.length !== 0) {
    return props.data.url
  }
  return getBingImageUrlFromName(props.data.name)
})

const isCurrSelectedImage = computed(() => {
  if (!props.select) {
    return false
  }
  return props.data.name === localConfig.general.backgroundImageName
})

const onSelectImage = () => {
  if (!props.select) {
    return
  }
  localConfig.general.backgroundImageName = props.data.name
  localConfig.general.backgroundImageDesc = props.data.desc
}

const onViewImage = () => {
  const url = getBingImageUrlFromName(props.data.name, 'UHD')
  createTab(url)
}

const onSaveImage = () => {
  const url = getBingImageUrlFromName(props.data.name, 'UHD')
  downloadImageByUrl(url, props.data.name)
}

const isFavoriteIconVisible = computed(() => {
  const favoriteBackgroundNameList = localConfig.general.favoriteImageList.map((item: FavoriteImageListItem) => item.name)
  return !favoriteBackgroundNameList.includes(props.data.name)
})

const onFavoriteImage = () => {
  if (localConfig.general.favoriteImageList.length >= FAVORITE_MAX_COUNT) {
    window.$message.error(window.$t('prompts.favoriteLimt'))
    return
  }
  localConfig.general.favoriteImageList.push({
    name: props.data.name,
    desc: props.data.desc,
  })
  window.$message.success(`${window.$t('common.favorite')}${window.$t('common.success')}`)
}

const onUnFavoriteImage = () => {
  const index = localConfig.general.favoriteImageList.findIndex((item: FavoriteImageListItem) => item.name === props.data.name)
  localConfig.general.favoriteImageList.splice(index, 1)
}

const customPrimaryColor = getStyleField('general', 'primaryColor')
</script>

<style scoped>
.image-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
  &:hover {
    .image__toolbar {
      bottom: 0 !important;
    }
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
.image-wrap--active {
  outline: 2px solid v-bind(customPrimaryColor);
}
</style>
