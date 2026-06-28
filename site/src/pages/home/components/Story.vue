<script setup lang="ts">
import { ref } from 'vue'
import { useScrollReveal } from '@site/composables/useScrollReveal'
import { prototypeUrl } from '@site/data/links'

const sectionRef = ref<HTMLElement>()
const isExpanded = ref(false)

useScrollReveal(sectionRef, { type: 'fade-in', threshold: 0.1 })
</script>

<template>
  <section ref="sectionRef" class="lp-story">
    <div class="lp-container">
      <h2 class="lp-story-title">{{ $t('story.title') }}</h2>

      <!-- 引用块 —— 始终可见，视觉焦点 -->
      <div class="lp-story-quote-wrap">
        <svg class="lp-story-quote-mark" width="32" height="28" viewBox="0 0 32 28" fill="currentColor" aria-hidden="true">
          <path d="M0 16c0-3.3 1-6 3-8s4.7-3 8-3v4c-1.9 0-3.4.6-4.5 1.9S4.8 13.9 4.8 16H14v12H0V16zm18 0c0-3.3 1-6 3-8s4.7-3 8-3v4c-1.9 0-3.4.6-4.5 1.9S22.8 13.9 22.8 16H32v12H18V16z"/>
        </svg>
        <blockquote class="lp-story-quote">
          <p>{{ $t('story.quote') }}</p>
        </blockquote>
      </div>

      <!-- 展开按钮 -->
      <div class="lp-story-toggle-wrap">
        <button
          class="lp-story-toggle"
          :aria-expanded="isExpanded"
          @click="isExpanded = !isExpanded"
        >
          <span>{{ isExpanded ? $t('story.collapse') : $t('story.expand') }}</span>
          <svg
            class="lp-story-toggle-icon"
            :class="{ 'is-open': isExpanded }"
            width="14" height="14" viewBox="0 0 14 14" fill="currentColor"
          >
            <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          </svg>
        </button>
      </div>

      <!-- 可展开内容 -->
      <Transition name="story-expand">
        <div v-show="isExpanded" class="lp-story-body">
          <p>{{ $t('story.p1') }}</p>

          <div class="lp-story-prototype">
            <div class="lp-story-prototype-frame">
              <iframe
                :src="prototypeUrl"
                title="NaiveTab prototype"
              />
            </div>
            <p class="lp-story-prototype-label">{{ $t('story.prototype') }}</p>
          </div>

          <p>{{ $t('story.p2') }}</p>
          <p>{{ $t('story.p3') }}</p>

          <p class="lp-story-closing">
            {{ $t('story.closing') }}
          </p>
        </div>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
.lp-story {
  padding: 120px 0;
  background:
    var(--lp-bg)
    linear-gradient(
      180deg,
      transparent 0%,
      rgb(99 102 241 / 0.015) 50%,
      transparent 100%
    );
}
.dark .lp-story {
  background:
    var(--lp-bg)
    linear-gradient(
      180deg,
      transparent 0%,
      rgb(129 140 248 / 0.03) 50%,
      transparent 100%
    );
}

.lp-story-title {
  font-size: 40px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 56px;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--lp-text);
}
@media (max-width: 768px) {
  .lp-story-title {
    font-size: 32px;
    margin-bottom: 40px;
  }
}

/* ---- 引用块 ---- */
.lp-story-quote-wrap {
  position: relative;
  max-width: 680px;
  margin: 0 auto;
  padding: 48px 0 0;
}
.lp-story-quote-mark {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  color: var(--lp-primary);
  opacity: 0.15;
}
.lp-story-quote {
  margin: 0;
  padding: 0;
}
.lp-story-quote p {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.8;
  color: var(--lp-text);
  text-align: center;
}
@media (max-width: 768px) {
  .lp-story-quote p {
    font-size: 17px;
  }
}

/* ---- 展开按钮 ---- */
.lp-story-toggle-wrap {
  text-align: center;
  margin-top: 40px;
}
.lp-story-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--lp-primary);
  background: none;
  border: 1px solid var(--lp-border);
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.2s, color 0.2s;
}
.lp-story-toggle:hover {
  border-color: var(--lp-primary);
  color: var(--lp-primary-hover);
}
.lp-story-toggle-icon {
  flex-shrink: 0;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.lp-story-toggle-icon.is-open {
  transform: rotate(45deg);
}

/* ---- 可展开内容 ---- */
.lp-story-body {
  max-width: 680px;
  margin: 48px auto 0;
  padding-top: 48px;
  border-top: 1px solid var(--lp-border);
}
.lp-story-body p {
  font-size: 15px;
  line-height: 1.9;
  color: var(--lp-text-secondary);
  margin: 0 0 24px;
}

/* ---- 原型 iframe ---- */
.lp-story-prototype {
  margin: 36px 0;
}
.lp-story-prototype-frame {
  width: 100%;
  aspect-ratio: 16 / 10;
  border: 1px solid var(--lp-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--lp-bg-alt);
}
.lp-story-prototype-frame iframe {
  width: 125%;
  height: 125%;
  border: none;
  transform: scale(0.8);
  transform-origin: top left;
}
.lp-story-prototype-label {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--lp-text-secondary);
  text-align: center;
}

/* ---- 结语 ---- */
.lp-story-closing {
  text-align: center;
  font-size: 17px;
  color: var(--lp-text);
  font-weight: 500;
  margin-top: 36px;
}

/* ---- 展开动画 ---- */
.story-expand-enter-active {
  animation: story-expand-in 0.5s ease both;
}
.story-expand-leave-active {
  animation: story-expand-in 0.3s ease reverse both;
}
@keyframes story-expand-in {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
