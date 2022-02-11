<template>
  <div class="image-wrap" :class="{ 'image-wrap--active': isCurrSelectedImage }">
    <NSpin :show="isCurrSelectedImage && isImageLoading">
      <img v-if="lazy" v-lazy="props.data.url" alt="" @click="onSelectImage()">
      <img v-else :src="props.data.url" alt="" @click="onSelectImage()">
    </NSpin>
    <div v-if="isCurrSelectedImage" class="image__current-mask">
      <line-md:confirm-circle />
    </div>
    <div class="image__toolbar">
      <NTooltip v-if="props.data.desc && props.data.desc.length !== 0" trigger="hover">
        <template #trigger>
          <div class="toolbar__icon">
            <ic:outline-info />
          </div>
        </template>
        <p>{{ props.data.desc }}</p>
      </NTooltip>
      <div class="toolbar__icon" @click="onViewImage()">
        <mdi:eye-circle-outline />
      </div>
      <div class="toolbar__icon" @click="onSaveImage()">
        <charm:download />
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
import { getStyleConst, createTab, localState, downloadImageByUrl, isImageLoading } from '@/logic'

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

const isCurrSelectedImage = computed(() => {
  if (!props.select) {
    return false
  }
  return props.data.id === localState.setting.general.backgroundImageId
})

const onSelectImage = () => {
  if (!props.select) {
    return
  }
  localState.setting.general.backgroundImageId = props.data.id
}

const onViewImage = () => {
  createTab(props.data.url)
}

const onSaveImage = () => {
  downloadImageByUrl(props.data.url)
}
const isFavoriteIconVisible = computed(() => {
  const favoriteBackgroundIdList = localState.setting.general.favoriteBackgroundList.map((item: ImageListItem) => item.id)
  return !favoriteBackgroundIdList.includes(props.data.id)
})

const onFavoriteImage = () => {
  localState.setting.general.favoriteBackgroundList.push({
    id: props.data.id,
    url: props.data.url,
    desc: props.data.desc,
  })
}

const onUnFavoriteImage = () => {
  const index = localState.setting.general.favoriteBackgroundList.findIndex((item: ImageListItem) => item.id === props.data.id)
  localState.setting.general.favoriteBackgroundList.splice(index, 1)
}
const themeColorMain = getStyleConst('themeColorMain')
</script>

<style scoped>
.image-wrap {
  position: relative;
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
    color: v-bind(themeColorMain);
  }
}
.image-wrap--active {
  outline: 2px solid v-bind(themeColorMain);
}
</style>
