<script setup lang="ts">
import { onMounted } from 'vue'
import { gaProxy } from '@/logic/utils/gtag'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import BaseSystemBookmarkManager from '@/components/BaseSystemBookmarkManager.vue'
import BaseBookmarkLayerTabSwitcher from '@/components/BaseBookmarkLayerTabSwitcher.vue'
import PopupDomainFilter from './components/PopupDomainFilter.vue'

// ── 键盘宽度计算 ────────────────────────────────────────────────────────
const CARD_CONTENT_H_PADDING = 28
const { getFirstRowWidth } = useKeyboardStyle('px', 40)
const popupWidth = computed(
  () => `${getFirstRowWidth() + CARD_CONTENT_H_PADDING}px`,
)

const popupStyle = computed(() => ({
  '--nt-popup-width': popupWidth.value,
  '--nt-popup-keyboard-border': 'rgba(0, 0, 0, 0.06)',
}))

onMounted(() => {
  gaProxy('view', ['popup', 'systemBookmark'])
})
</script>

<template>
  <NCard
    id="popup"
    :style="popupStyle"
  >
    <template #header>
      <div class="popup__header">
        <span class="header__title">{{ $t('popup.configNaivetab') }}</span>
        <BaseBookmarkLayerTabSwitcher />
      </div>
    </template>

    <BaseSystemBookmarkManager
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
          background-color: var(--nt-primary-color);
          opacity: 0.8;
          flex-shrink: 0;
        }
      }
    }
  }

  .n-card-content {
    padding: 0 !important;
    .base-system-bookmark-manager {
      margin-top: 20px;
    }
  }
}
</style>
