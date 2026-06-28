<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { animate, stagger } from 'animejs'
import { withBase } from '@site/utils/withBase'
import { useScrollReveal } from '@site/composables/useScrollReveal'
import { useI18n } from 'vue-i18n'
import InstallButtons from './InstallButtons.vue'

const { t } = useI18n()

const heroRef = ref<HTMLElement>()
const titleRef = ref<HTMLElement>()

useScrollReveal(heroRef, { type: 'fade-up', stagger: 0.15, threshold: 0.1 })

/** 逐字标题 */
const titleChars = computed(() => t('hero.title').split(''))

onMounted(() => {
  const chars = titleRef.value?.querySelectorAll<HTMLElement>('.lp-hero-title-char')
  if (chars && chars.length > 0) {
    animate(chars, {
      opacity: [0, 1],
      translateY: [24, 0],
      rotateX: [25, 0],
      duration: 600,
      ease: 'spring(1, 100, 12, 0)',
      delay: stagger(30),
    })
  }
})

/** logo hover 弹簧微动效 */
function onLogoEnter(e: MouseEvent) {
  animate(e.currentTarget as HTMLElement, {
    scale: [1, 1.06],
    rotate: [0, 4],
    duration: 300,
    ease: 'spring(1, 100, 14, 0)',
  })
}
function onLogoLeave(e: MouseEvent) {
  animate(e.currentTarget as HTMLElement, {
    scale: [1.06, 1],
    rotate: [4, 0],
    duration: 400,
    ease: 'spring(1, 80, 16, 0)',
  })
}
</script>

<template>
  <section ref="heroRef" class="lp-hero">
    <div class="lp-container lp-hero-inner">
      <div class="lp-hero-content">
        <h1 ref="titleRef" class="lp-hero-title">
          <span
            v-for="(char, i) in titleChars"
            :key="i"
            class="lp-hero-title-char"
          >{{ char }}</span>
        </h1>
        <p class="lp-hero-subtitle">{{ $t('hero.subtitle') }}</p>
        <p class="lp-hero-desc">{{ $t('hero.desc') }}</p>

        <div class="lp-hero-actions">
          <InstallButtons />
        </div>
      </div>

      <div class="lp-hero-visual">
        <img
          :src="withBase('/images/logo.svg')"
          alt="NaiveTab"
          class="lp-hero-visual-logo"
          @mouseenter="onLogoEnter"
          @mouseleave="onLogoLeave"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.lp-hero {
  position: relative;
  padding: 180px 0 120px;
  overflow: hidden;
}

.lp-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 80px;
}
@media (max-width: 960px) {
  .lp-hero-inner {
    flex-direction: column;
    text-align: center;
    gap: 60px;
  }
  .lp-hero-actions {
    justify-content: center;
  }
}
.lp-hero-content {
  flex: 1;
  min-width: 0;
}
.lp-hero-title {
  font-size: 72px;
  font-weight: 800;
  line-height: 1.05;
  margin: 0 0 16px;
  letter-spacing: -0.03em;
  perspective: 400px;
}
/* 逐字渐变 */
.lp-hero-title-char {
  display: inline-block;
  will-change: transform, opacity;
  background: linear-gradient(135deg, #5b21b6 0%, #6366f1 50%, #818cf8 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.dark .lp-hero-title-char {
  background: linear-gradient(135deg, #a5b4fc 0%, #c7d2fe 50%, #ddd6fe 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
@media (max-width: 768px) {
  .lp-hero-title {
    font-size: 48px;
  }
}
.lp-hero-subtitle {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 20px;
  color: var(--lp-text);
}
@media (max-width: 768px) {
  .lp-hero-subtitle {
    font-size: 22px;
  }
}
.lp-hero-desc {
  font-size: 17px;
  line-height: 1.8;
  color: var(--lp-text-secondary);
  margin: 0 0 40px;
  max-width: 520px;
}
@media (max-width: 960px) {
  .lp-hero-desc {
    max-width: 100%;
  }
}
.lp-hero-actions {
  display: flex;
  gap: 12px;
}
.lp-hero-visual {
  flex: 0 0 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}
@media (max-width: 960px) {
  .lp-hero-visual {
    flex: 0 0 auto;
    width: 100%;
    max-width: 520px;
  }
}
.lp-hero-visual-logo {
  width: 240px;
  height: 240px;
  border-radius: 36px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: box-shadow 0.3s ease;
}
.lp-hero-visual-logo:hover {
  box-shadow: 0 8px 40px rgb(99 102 241 / 0.2);
}
.dark .lp-hero-visual-logo:hover {
  box-shadow: 0 8px 40px rgb(129 140 248 / 0.25);
}
.dark .lp-hero-visual-logo {
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
}
</style>
