<script setup lang="ts">
import { ref } from 'vue'
import { useScrollReveal } from '@site/composables/useScrollReveal'
import Screenshot from './Screenshot.vue'

const sectionRef = ref<HTMLElement>()

useScrollReveal(sectionRef, { type: 'fade-up', stagger: 0.1, threshold: 0.1 })

const sections = [
  { key: 'bookmark', align: 'left' as const, layout: 'side' as const, images: ['/images/screenshot/1.png'] },
  { key: 'commands', align: 'right' as const, layout: 'side' as const, images: ['/images/screenshot/2.png'] },
  { key: 'customize', align: 'left' as const, layout: 'stack' as const, images: ['/images/screenshot/3.png', '/images/screenshot/4.png'] },
]
</script>

<template>
  <section ref="sectionRef" class="lp-features">
    <div class="lp-container">
      <h2 class="lp-features-section-title">{{ $t('features.title') }}</h2>
      <p class="lp-features-section-subtitle">{{ $t('features.subtitle') }}</p>

      <div
        v-for="s in sections"
        :key="s.key"
        class="lp-feature-block"
        :class="{
          'lp-feature-block--reversed': s.align === 'right',
          'lp-feature-block--stack': s.layout === 'stack',
        }"
      >
        <div class="lp-feature-text">
          <h2 class="lp-feature-title">{{ $t(`features.${s.key}.title`) }}</h2>
          <p class="lp-feature-desc">{{ $t(`features.${s.key}.desc`) }}</p>
        </div>
        <div
          class="lp-feature-visual"
          :class="{ 'lp-feature-visual--row': s.layout === 'stack' }"
        >
          <Screenshot
            v-for="(img, i) in s.images"
            :key="i"
            :src="img"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lp-features {
  padding: 120px 0;
  background:
    var(--lp-bg)
    linear-gradient(
      180deg,
      transparent 0%,
      rgb(99 102 241 / 0.02) 50%,
      transparent 100%
    );
}
.dark .lp-features {
  background:
    var(--lp-bg)
    linear-gradient(
      180deg,
      transparent 0%,
      rgb(129 140 248 / 0.04) 50%,
      transparent 100%
    );
}
.lp-features-section-title {
  font-size: 56px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 16px;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--lp-text);
}
@media (max-width: 768px) {
  .lp-features-section-title {
    font-size: 32px;
  }
}
.lp-features-section-subtitle {
  font-size: 17px;
  text-align: center;
  color: var(--lp-text-secondary);
  margin: 0 0 64px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.7;
}
.lp-feature-block {
  display: flex;
  align-items: center;
  gap: 80px;
  margin-bottom: 160px;
}
.lp-feature-block:last-child {
  margin-bottom: 0;
}
.lp-feature-block--reversed {
  flex-direction: row-reverse;
}
/* stack 布局：标题独占一行在上，图片横排在下 */
.lp-feature-block--stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 48px;
}
.lp-feature-block--stack .lp-feature-desc {
  max-width: 560px;
}
@media (max-width: 960px) {
  .lp-feature-block {
    flex-direction: column !important;
    gap: 40px;
    margin-bottom: 100px;
    text-align: center;
  }
  .lp-feature-block--stack {
    align-items: center;
  }
}
.lp-feature-text {
  flex: 1;
  min-width: 0;
}
.lp-feature-title {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.15;
  margin: 0 0 20px;
  letter-spacing: -0.02em;
  color: var(--lp-text);
}
@media (max-width: 768px) {
  .lp-feature-title {
    font-size: 32px;
  }
}
.lp-feature-desc {
  font-size: 17px;
  line-height: 1.8;
  color: var(--lp-text-secondary);
  margin: 0;
  max-width: 440px;
}
@media (max-width: 960px) {
  .lp-feature-desc {
    max-width: 100%;
  }
}
.lp-feature-visual {
  flex: 0 0 640px;
}
/* stack 布局：图片横排并排 */
.lp-feature-visual--row {
  flex: 0 0 auto;
  width: 100%;
  display: flex;
  gap: 24px;
}
.lp-feature-visual--row > * {
  flex: 1;
  min-width: 0;
}
@media (max-width: 960px) {
  .lp-feature-visual {
    flex: 0 0 auto;
    width: 100%;
  }
  .lp-feature-visual--row {
    flex-direction: column;
  }
}
</style>
