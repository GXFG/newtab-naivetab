<script setup lang="ts">
import { ref } from 'vue'
import { useScrollReveal } from '@site/composables/useScrollReveal'

const sectionRef = ref<HTMLElement>()

useScrollReveal(sectionRef, { type: 'fade-up', stagger: 0.06, threshold: 0.1 })

const groups = [
  {
    labelKey: 'capabilities.groups.keyboardAndBookmark',
    items: ['keyboardBookmark', 'keyboardCommand', 'keyboardLayout', 'bookmarkFolder'],
  },
  {
    labelKey: 'capabilities.groups.timeAndDate',
    items: ['clockDate', 'calendar', 'yearProgress', 'countdown'],
  },
  {
    labelKey: 'capabilities.groups.tool',
    items: ['search', 'memo', 'weather', 'news'],
  },
]
</script>

<template>
  <section ref="sectionRef" class="lp-capabilities lp-section--gradient-alt">
    <div class="lp-container">
      <h2 class="lp-capabilities-title">{{ $t('capabilities.title') }}</h2>
      <p class="lp-capabilities-subtitle">{{ $t('capabilities.subtitle') }}</p>

      <div
        v-for="group in groups"
        :key="group.labelKey"
        class="lp-capabilities-group"
      >
        <h3 class="lp-capabilities-group-title">{{ $t(group.labelKey) }}</h3>
        <div class="lp-capabilities-grid">
          <div
            v-for="key in group.items"
            :key="key"
            class="lp-capability-card lp-card--glow"
          >
            <h4 class="lp-capability-card-title">{{ $t(`capabilities.items.${key}.title`) }}</h4>
            <p class="lp-capability-card-desc">{{ $t(`capabilities.items.${key}.desc`) }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lp-capabilities {
  padding: 120px 0;
}
.lp-capabilities-title {
  font-size: 40px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 16px;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--lp-text);
}
@media (max-width: 768px) {
  .lp-capabilities-title {
    font-size: 32px;
  }
}
.lp-capabilities-subtitle {
  font-size: 17px;
  text-align: center;
  color: var(--lp-text-secondary);
  margin: 0 0 64px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.7;
}
.lp-capabilities-group {
  margin-bottom: 48px;
}
.lp-capabilities-group:last-child {
  margin-bottom: 0;
}
.lp-capabilities-group-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px;
  color: var(--lp-text);
  padding-left: 4px;
}
.lp-capabilities-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}
.lp-capability-card {
  flex: 1 1 200px;
  min-width: 180px;
  max-width: 280px;
  padding: 24px;
  background: var(--lp-bg);
  border-radius: 14px;
}
.lp-capability-card-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--lp-text);
}
.lp-capability-card-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--lp-text-secondary);
  margin: 0;
}
</style>
