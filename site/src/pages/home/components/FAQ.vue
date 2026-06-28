<script setup lang="ts">
import { ref, computed } from 'vue'
import { useScrollReveal } from '@site/composables/useScrollReveal'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const sectionRef = ref<HTMLElement>()
const openIndex = ref<number | null>(null)

useScrollReveal(sectionRef, { type: 'fade-in', threshold: 0.1 })

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}

const faqItems = computed(() =>
  [1, 2, 3, 4].map(i => ({
    q: t(`faq.q${i}`),
    a: t(`faq.a${i}`),
  }))
)
</script>

<template>
  <section ref="sectionRef" class="lp-faq lp-section--gradient-alt">
    <div class="lp-container">
      <h2 class="lp-faq-title">{{ $t('faq.title') }}</h2>

      <div class="lp-faq-list">
        <div
          v-for="(item, i) in faqItems"
          :key="i"
          class="lp-faq-item"
        >
          <button
            class="lp-faq-question"
            @click="toggle(i)"
            :aria-expanded="openIndex === i"
          >
            <span>{{ item.q }}</span>
            <svg
              class="lp-faq-chevron"
              :class="{ open: openIndex === i }"
              width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div
            v-if="openIndex === i"
            class="lp-faq-answer"
          >
            <p>{{ item.a }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lp-faq {
  padding: 100px 0;
}
.lp-faq-title {
  font-size: 40px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--lp-text);
}
@media (max-width: 768px) {
  .lp-faq-title {
    font-size: 32px;
  }
}
.lp-faq-list {
  max-width: 720px;
  margin: 0 auto;
}
.lp-faq-item {
  border-bottom: 1px solid var(--lp-border);
}
.lp-faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 20px 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--lp-text);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: color 0.2s;
}
.lp-faq-question:hover {
  color: var(--lp-primary);
}
.lp-faq-chevron {
  flex-shrink: 0;
  transition: transform 0.25s ease;
  color: var(--lp-text-secondary);
}
.lp-faq-chevron.open {
  transform: rotate(180deg);
}
.lp-faq-answer {
  padding: 0 0 20px;
  animation: faq-fade-in 0.2s ease;
}
@keyframes faq-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.lp-faq-answer p {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--lp-text-secondary);
}
</style>
