<template>
  <!-- ImagePicker: bing & favorite -->
  <NModal
    :show="props.show"
    style="width: 700px"
    preset="card"
    :title="`${$t('common.edit')}${$t('common.backgroundImage')}`"
    :mask-closable="true"
    @update:show="props.change()"
  >
    <div class="modal__content">
      <div>
        <p class="picker__label">
          {{ `${$t('common.current')}${$t('common.backgroundImage')}` }}
        </p>
        <div class="image__item">
          <BackgroundImageElement
            :lazy="false"
            :data="{
              id: localState.setting.general.backgroundImageId,
              url: localState.setting.general.backgroundImageUrl,
              desc: localState.setting.general.backgroundImageDesc,
            }"
          />
        </div>
      </div>
      <NSpin :show="isImageListLoading">
        <NCollapse default-expanded-names="favorite" accordion>
          <NCollapseItem v-for="origin of Object.keys(currPreviewImageListMap)" :key="origin" :title="$t(`common.${origin}`)" :name="origin">
            <div class="picker__images">
              <div v-for="item in currPreviewImageListMap[origin]" :key="item.url" class="image__item">
                <BackgroundImageElement :data="item" select :delete="origin === 'favorite'" />
              </div>
            </div>
          </NCollapseItem>
        </NCollapse>
      </NSpin>
    </div>
  </NModal>
</template>
<script setup lang="ts">
import { currPreviewImageListMap, localState, isImageListLoading } from '@/logic'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  change: {
    type: Function,
    required: true,
  },
})
</script>

<style scoped>
.modal__content {
  height: 50vh;
  .picker__label {
    opacity: 0.6;
  }
  .picker__images {
    display: flex;
    flex-wrap: wrap;
  }
  .image__item {
    flex: 0 0 auto;
    margin: 1.5%;
    width: 30%;
    height: 110px;
  }
}
</style>
