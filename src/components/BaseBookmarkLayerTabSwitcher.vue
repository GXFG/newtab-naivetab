<script setup lang="ts">
/**
 * @module BaseBookmarkLayerTabSwitcher
 * @description 书签层切换标签（pill tabs），用于 Popup 和 Setting 面板中切换 bookmark layer
 */
import { computed } from 'vue'
import { localConfig } from '@/logic/config/state'
import { cachedActiveLayer, switchLayer } from '@/logic/keyboard/bookmark-state'

/**
 * 有配置的层列表（sourceFolderPath 非空）
 */
const configuredLayers = computed(() => {
  const { layers } = localConfig.keyboardBookmark
  return layers
    .map((l, i) => ({
      index: i,
      title: (l.sourceFolderPath || '').split('/').pop() || '',
    }))
    .filter((l) => l.title)
})
</script>

<template>
  <div
    v-if="configuredLayers.length > 1"
    class="layer-tab-switcher"
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
</template>

<style>
.layer-tab-switcher {
  display: flex;
  gap: 6px;
  align-items: center;

  .layer-tab {
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 6px;
    cursor: pointer;
    color: var(--n-text-color-3);
    font-weight: 600;
    transition: all 0.15s ease;
    white-space: nowrap;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;

    &:hover {
      background-color: var(--gray-alpha-10);
      color: var(--n-text-color);
    }

    &:active {
      transform: scale(0.96);
    }

    &.layer-tab--active {
      color: var(--nt-popup-custom-primary-color, var(--n-color-target));
      background-color: var(--gray-alpha-12);
    }
  }
}
</style>
