<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { gaProxy } from '@/logic/utils/gtag'
import { customPrimaryColor } from '@/logic/store/style'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import BaseNaiveBookmarkManager from '@/components/BaseNaiveBookmarkManager.vue'
import PopupDomainFilter from './components/PopupDomainFilter.vue'

// ── 键盘宽度计算 ────────────────────────────────────────────────────────
const CARD_CONTENT_H_PADDING = 28
const { getFirstRowWidth } = useKeyboardStyle('px', 40)
const popupWidth = computed(
  () => `${getFirstRowWidth() + CARD_CONTENT_H_PADDING}px`,
)

const popupStyle = computed(() => ({
  '--nt-popup-width': popupWidth.value,
  '--nt-popup-custom-primary-color': customPrimaryColor.value,
}))

onMounted(() => {
  gaProxy('view', ['popup', 'naiveBookmark'])
})

// ── 同步状态 ────────────────────────────────────────────────────────────
const bookmarkManagerRef = ref<InstanceType<typeof BaseNaiveBookmarkManager>>()
const hasPendingSync = computed(
  () => bookmarkManagerRef.value?.hasPendingSync ?? false,
)
</script>

<template>
  <NCard
    id="popup"
    :style="popupStyle"
  >
    <template #header>
      <div class="popup__header">
        <span class="header__title">{{ $t('popup.configNaivetab') }}</span>
        <span
          v-show="hasPendingSync"
          class="header__syncing"
        >
          <Icon
            :icon="ICONS.loading"
            class="syncing__icon"
          />
          {{ $t('popup.syncingStatus') }}
        </span>
      </div>
    </template>

    <BaseNaiveBookmarkManager
      ref="bookmarkManagerRef"
      :base-size="35"
      immediate-sync
    />

    <PopupDomainFilter />
  </NCard>
</template>

<style>
#popup {
  width: var(--nt-popup-width);
  border-radius: 0 !important;
  overflow: hidden;

  .n-card-header {
    padding: 0 !important;
    border-bottom: 1px solid var(--nt-popup-keyboard-border);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.04) 0%,
      transparent 100%
    );

    .popup__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 18px;

      .header__title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.5px;
        opacity: 0.88;

        &::before {
          content: '';
          display: inline-block;
          width: 3px;
          height: 13px;
          border-radius: 2px;
          background-color: var(--nt-popup-custom-primary-color);
          opacity: 0.8;
          flex-shrink: 0;
        }
      }

      .header__syncing {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: var(--n-text-color-3);
        user-select: none;

        .syncing__icon {
          font-size: 16px;
        }
      }
    }
  }

  .n-card-content {
    padding: 0 !important;
    .base-naive-bookmark-manager {
      margin-top: 20px;
    }
  }
}
</style>
