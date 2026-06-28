<script setup lang="ts">
import { ref } from 'vue'
import { useScrollReveal } from '@site/composables/useScrollReveal'
import InstallButtons from './InstallButtons.vue'

const sectionRef = ref<HTMLElement>()

useScrollReveal(sectionRef, { type: 'scale-in', threshold: 0.15 })
</script>

<template>
  <section ref="sectionRef" class="lp-cta lp-section--gradient-alt">
    <div class="lp-container lp-cta-inner">
      <h2 class="lp-cta-title lp-title--gradient">{{ $t('cta.title') }}</h2>
      <InstallButtons />
    </div>
  </section>
</template>

<style scoped>
.lp-cta {
  padding: 120px 0;
}
.lp-cta-inner {
  text-align: center;
}
.lp-cta-title {
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 36px;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
@media (max-width: 768px) {
  .lp-cta-title {
    font-size: 32px;
  }
}
</style>
