<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { gaProxy } from '@/logic/gtag'
import { customPrimaryColor, localConfig } from '@/logic/store'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import BookmarkBindingManager from '@/components/BookmarkBindingManager.vue'
import {
  cachedActiveLayer,
  switchLayer,
} from '@/newtab/widgets/keyboardBookmark/logic'

// ── 键盘宽度计算 ────────────────────────────────────────────────────────
const CARD_CONTENT_H_PADDING = 28
const { getFirstRowWidth } = useKeyboardStyle('px', 40)
const popupWidth = computed(
  () => `${getFirstRowWidth() + CARD_CONTENT_H_PADDING}px`,
)

const popupStyle = computed(() => ({
  '--nt-popup-width': popupWidth.value,
  '--nt-popup-keyboard-border': 'rgba(0, 0, 0, 0.06)',
  '--nt-popup-custom-primary-color': customPrimaryColor.value,
}))

/**
 * 有配置的层列表（sourceFolderTitle 非空）
 */
const configuredLayers = computed(() => {
  const { layers } = localConfig.keyboardBookmark
  return layers
    .map((l, i) => ({ index: i, title: l.sourceFolderTitle }))
    .filter((l) => l.title)
})

onMounted(() => {
  gaProxy('view', ['popup'], {
    userAgent: navigator.userAgent,
  })
})
</script>

<template>
  <NCard
    id="popup"
    :style="popupStyle"
  >
    <template #header>
      <div class="popup__header">
        <span class="header__title">{{ $t('popup.bindingBookmark') }}</span>
        <div
          v-if="configuredLayers.length > 1"
          class="layer-tabs"
        >
          <span
            v-for="layer in configuredLayers"
            :key="layer.index"
            class="layer-tab"
            :class="{ 'layer-tab--active': layer.index === cachedActiveLayer }"
            @click="switchLayer(layer.index)"
          >
            {{ layer.title }}
          </span>
        </div>
      </div>
    </template>

    <BookmarkBindingManager
      :base-size="35"
      immediate-sync
    />
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
    }
  }

  .n-card-content {
    padding: 0 !important;
    .bookmark-binding-manager {
      margin-top: 20px;
    }
  }
}

.layer-tabs {
  display: flex;
  gap: 4px;
  align-items: center;
}

.layer-tab {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--n-text-color-3);
  transition: all 0.2s;
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-tab:hover {
  background-color: var(--gray-alpha-8);
  color: var(--n-text-color);
}

.layer-tab--active {
  color: var(--nt-popup-custom-primary-color);
  font-weight: 600;
  background-color: var(--gray-alpha-8);
}
</style>
