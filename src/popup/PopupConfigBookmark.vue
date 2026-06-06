<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { gaProxy } from '@/logic/utils/gtag'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import { localConfig } from '@/logic/config/state'
import { BookmarkSource } from '@/common/widget-constants'
import BaseSystemBookmarkManager from '@/components/BaseSystemBookmarkManager.vue'
import BaseNaiveBookmarkManager from '@/components/BaseNaiveBookmarkManager.vue'
import BaseBookmarkLayerTabSwitcher from '@/components/BaseBookmarkLayerTabSwitcher.vue'
import PopupDomainFilter from './components/PopupDomainFilter.vue'

const isSystemBookmark = computed(
  () => localConfig.keyboardBookmark.source === BookmarkSource.BROWSER,
)

const CARD_CONTENT_H_PADDING = 28
const { getFirstRowWidth } = useKeyboardStyle('px', 40)
const popupWidth = computed(
  () => `${getFirstRowWidth() + CARD_CONTENT_H_PADDING}px`,
)
const popupStyle = computed(() => ({ '--nt-popup-width': popupWidth.value }))

const bookmarkManagerRef = ref<InstanceType<typeof BaseNaiveBookmarkManager>>()
const hasPendingSync = computed(
  () => bookmarkManagerRef.value?.hasPendingSync ?? false,
)

onMounted(() => {
  gaProxy('view', [
    'popup',
    isSystemBookmark.value ? 'systemBookmark' : 'naiveBookmark',
  ])
})
</script>

<template>
  <NTCard
    id="popup"
    :title="$t('popup.configNaivetab')"
    :style="popupStyle"
  >
    <template
      v-if="isSystemBookmark"
      #header-extra
    >
      <BaseBookmarkLayerTabSwitcher />
    </template>

    <template
      v-else-if="hasPendingSync"
      #header-extra
    >
      <span class="syncing">
        <Icon
          :icon="ICONS.loading"
          class="syncing__icon"
        />
        {{ $t('popup.syncingStatus') }}
      </span>
    </template>

    <div class="popup__body">
      <BaseSystemBookmarkManager
        v-if="isSystemBookmark"
        :base-size="35"
        immediate-sync
      />
      <BaseNaiveBookmarkManager
        v-else
        ref="bookmarkManagerRef"
        :base-size="35"
        immediate-sync
      />
    </div>

    <PopupDomainFilter />
  </NTCard>
</template>

<style>
#popup {
  width: var(--nt-popup-width);

  .reka-card__header {
    padding: 0 20px;
    height: 45px;
  }
  .reka-card__body {
    padding: 0;
  }

  .popup__body {
    margin-top: 20px;
  }

  .syncing {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--nt-text-tertiary);
    user-select: none;
    .syncing__icon {
      font-size: 16px;
    }
  }
}
</style>
