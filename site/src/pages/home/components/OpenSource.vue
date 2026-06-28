<script setup lang="ts">
import { ref } from 'vue'
import { useScrollReveal } from '@site/composables/useScrollReveal'

const sectionRef = ref<HTMLElement>()

useScrollReveal(sectionRef, { type: 'fade-up', stagger: 0.08, threshold: 0.1 })
</script>

<template>
  <section ref="sectionRef" class="lp-opensource lp-section--gradient-alt">
    <div class="lp-container">
      <h2 class="lp-opensource-title">{{ $t('opensource.title') }}</h2>
      <p class="lp-opensource-subtitle">{{ $t('opensource.subtitle') }}</p>

      <div class="lp-opensource-grid">
        <div class="lp-opensource-card">
          <div class="lp-opensource-card-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 4.09 1A5.07 5.07 0 0 0 4 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8 18.13V22"/>
            </svg>
          </div>
          <h3 class="lp-opensource-card-title">{{ $t('opensource.points.openSource.title') }}</h3>
          <p class="lp-opensource-card-desc">{{ $t('opensource.points.openSource.desc') }}</p>
          <a
            href="https://github.com/GXFG/newtab-naivetab"
            target="_blank"
            class="lp-opensource-card-link"
          >{{ $t('opensource.viewOnGithub') }}</a>
        </div>

        <div class="lp-opensource-card">
          <div class="lp-opensource-card-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <h3 class="lp-opensource-card-title">{{ $t('opensource.points.free.title') }}</h3>
          <p class="lp-opensource-card-desc">{{ $t('opensource.points.free.desc') }}</p>
        </div>

        <div class="lp-opensource-card">
          <div class="lp-opensource-card-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <h3 class="lp-opensource-card-title">{{ $t('opensource.points.localFirst.title') }}</h3>
          <p class="lp-opensource-card-desc">{{ $t('opensource.points.localFirst.desc') }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lp-opensource {
  padding: 120px 0;
}

.lp-opensource-title {
  font-size: 40px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 16px;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--lp-text);
}
@media (max-width: 768px) {
  .lp-opensource-title {
    font-size: 32px;
  }
}

.lp-opensource-subtitle {
  font-size: 17px;
  text-align: center;
  color: var(--lp-text-secondary);
  margin: 0 0 64px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.7;
}

.lp-opensource-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 960px;
  margin: 0 auto;
}
@media (max-width: 768px) {
  .lp-opensource-grid {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
}

.lp-opensource-card {
  padding: 40px 32px;
  background: var(--lp-bg);
  border: 1px solid var(--lp-border);
  border-radius: 16px;
  text-align: center;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.lp-opensource-card:hover {
  border-color: transparent;
  box-shadow: 0 2px 24px rgb(99 102 241 / 0.06);
}

.lp-opensource-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--lp-primary-light);
  color: var(--lp-primary);
  margin-bottom: 20px;
}

.lp-opensource-card-title {
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 10px;
  color: var(--lp-text);
}

.lp-opensource-card-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--lp-text-secondary);
  margin: 0 0 16px;
}

.lp-opensource-card-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--lp-primary);
  text-decoration: none;
  transition: color 0.2s;
}
.lp-opensource-card-link:hover {
  color: var(--lp-primary-hover);
}
</style>
