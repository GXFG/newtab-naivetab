<script setup lang="ts">
import { withBase } from '@site/utils/withBase'

defineProps<{
  src?: string
  alt?: string
}>()
</script>

<template>
  <div class="lp-screenshot">
    <img
      v-if="src"
      :src="withBase(src)"
      :alt="alt ?? ''"
      class="lp-screenshot-img"
    />
    <div v-else class="lp-screenshot-placeholder">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span>Screenshot</span>
    </div>
  </div>
</template>

<style scoped>
.lp-screenshot {
  width: 100%;
  aspect-ratio: 16 / 10;
  border: 1px solid var(--lp-border);
  border-radius: 20px;
  overflow: hidden;
  background: var(--lp-bg-alt);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.lp-screenshot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lp-screenshot-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--lp-text-secondary);
  font-size: 14px;
  font-weight: 500;
}
</style>
