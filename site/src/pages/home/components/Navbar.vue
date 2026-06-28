<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { withBase } from '@site/utils/withBase'
import {
  changelogLink,
  sponsorLink,
  issuesLink,
  emailLink,
  githubLink,
} from '@site/data/links'
import { persistLocale } from '@site/i18n'
import { useTheme } from '@site/composables/useTheme'

const { locale } = useI18n()
const { isDark, toggleTheme } = useTheme()

/** 支持的语言 */
const LOCALE_OPTIONS: Record<string, string> = {
  'zh-CN': '中文',
  'en-US': 'EN',
}

const navbarRef = ref<HTMLElement>()
const feedbackOpen = ref(false)
const feedbackRef = ref<HTMLElement>()
const localeOpen = ref(false)
const localeRef = ref<HTMLElement>()

/** 语言切换 */
function switchLocale(localeCode: string) {
  locale.value = localeCode
  persistLocale(localeCode)
  localeOpen.value = false
}

let scrollObs: IntersectionObserver | null = null

/** 点击外部关闭下拉 */
function onDocumentClick(e: MouseEvent) {
  if (feedbackRef.value && !feedbackRef.value.contains(e.target as Node)) {
    feedbackOpen.value = false
  }
  if (localeRef.value && !localeRef.value.contains(e.target as Node)) {
    localeOpen.value = false
  }
}

onMounted(() => {
  const el = navbarRef.value
  if (!el) return

  // 滚动时导航栏增加阴影
  const sentinel = document.createElement('div')
  sentinel.style.position = 'absolute'
  sentinel.style.top = '0'
  sentinel.style.height = '1px'
  sentinel.style.pointerEvents = 'none'
  el.before(sentinel)

  scrollObs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        el.style.boxShadow = 'none'
      } else {
        el.style.boxShadow = '0 1px 3px rgb(0 0 0 / 0.04)'
      }
    },
    { threshold: 0 },
  )
  scrollObs.observe(sentinel)

  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  scrollObs?.disconnect()
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <header ref="navbarRef" class="lp-navbar">
    <div class="lp-container lp-navbar-inner">
      <a href="/newtab-naivetab/" class="lp-navbar-logo">
        <img :src="withBase('/images/logo.svg')" alt="NaiveTab" class="lp-navbar-logo-img" />
        <span class="lp-navbar-logo-text">NaiveTab</span>
      </a>

      <div class="lp-navbar-right">
        <a
          :href="changelogLink.url"
          class="lp-navbar-link"
          target="_blank"
        >{{ $t(changelogLink.textKey) }}</a>
        <a
          :href="sponsorLink.url"
          class="lp-navbar-link"
          target="_blank"
        >{{ $t(sponsorLink.textKey) }}</a>

        <!-- 反馈建议下拉 -->
        <div ref="feedbackRef" class="lp-navbar-feedback">
          <button
            class="lp-navbar-link lp-navbar-feedback-toggle"
            :aria-expanded="feedbackOpen"
            @click.stop="feedbackOpen = !feedbackOpen"
          >
            {{ $t('nav.feedback') }}
            <svg
              class="lp-navbar-feedback-chevron"
              :class="{ open: feedbackOpen }"
              width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
            >
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <Transition name="feedback-drop">
            <div v-if="feedbackOpen" class="lp-navbar-feedback-menu">
              <a
                :href="issuesLink.url"
                class="lp-navbar-feedback-item"
                target="_blank"
                @click="feedbackOpen = false"
              >{{ $t(issuesLink.textKey) }}</a>
              <a
                :href="emailLink.url"
                class="lp-navbar-feedback-item"
                @click="feedbackOpen = false"
              >{{ $t(emailLink.textKey) }}</a>
            </div>
          </Transition>
        </div>

        <!-- 语言切换 -->
        <div ref="localeRef" class="lp-navbar-locale">
          <button
            class="lp-navbar-link lp-navbar-locale-toggle"
            :aria-expanded="localeOpen"
            :aria-label="$t('nav.language')"
            @click.stop="localeOpen = !localeOpen"
          >
            {{ LOCALE_OPTIONS[locale] }}
            <svg
              class="lp-navbar-locale-chevron"
              :class="{ open: localeOpen }"
              width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
            >
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <Transition name="feedback-drop">
            <div v-if="localeOpen" class="lp-navbar-locale-menu">
              <button
                v-for="(label, code) in LOCALE_OPTIONS"
                :key="code"
                class="lp-navbar-locale-item"
                :class="{ active: locale === code }"
                @click="switchLocale(code)"
              >{{ label }}</button>
            </div>
          </Transition>
        </div>

        <!-- 深浅模式切换 -->
        <button
          type="button"
          class="lp-navbar-theme"
          :aria-label="$t('nav.theme')"
          @click="toggleTheme"
        >
          <!-- 浅色模式显示月亮（切换到深色） -->
          <svg
            v-if="!isDark"
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <!-- 深色模式显示太阳（切换到浅色） -->
          <svg
            v-else
            width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        </button>

        <a :href="githubLink.url" class="lp-navbar-github" target="_blank" aria-label="GitHub">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        </a>
      </div>
    </div>
  </header>
</template>

<style scoped>
.lp-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--lp-border);
  transition: box-shadow 0.3s ease;
}
.dark .lp-navbar {
  background: rgba(12, 10, 9, 0.8);
}
.lp-navbar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  gap: 32px;
}
.lp-navbar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--lp-text);
  flex-shrink: 0;
}
.lp-navbar-logo-img {
  width: 28px;
  height: 28px;
}
.lp-navbar-logo-text {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.lp-navbar-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--lp-text-secondary);
  text-decoration: none;
  transition: color 0.2s;
  white-space: nowrap;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}
.lp-navbar-link:hover {
  color: var(--lp-text);
}
.lp-navbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}
.lp-navbar-github {
  color: var(--lp-text-secondary);
  transition: color 0.2s;
  display: flex;
}
.lp-navbar-github:hover {
  color: var(--lp-text);
}

/* ---- 深浅模式切换 ---- */
.lp-navbar-theme {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--lp-text-secondary);
  padding: 4px;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
}
.lp-navbar-theme:hover {
  color: var(--lp-text);
  background: var(--lp-bg-alt);
}

/* ---- 语言切换 ---- */
.lp-navbar-locale {
  position: relative;
}
.lp-navbar-locale-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
}
.lp-navbar-locale-chevron {
  transition: transform 0.25s ease;
  color: var(--lp-text-secondary);
}
.lp-navbar-locale-chevron.open {
  transform: rotate(180deg);
}
.lp-navbar-locale-menu {
  position: absolute;
  top: 100%;
  right: -12px;
  margin-top: 8px;
  min-width: 100px;
  padding: 6px;
  background: var(--lp-bg);
  border: 1px solid var(--lp-border);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}
.dark .lp-navbar-locale-menu {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.lp-navbar-locale-item {
  font-size: 13px;
  font-weight: 500;
  color: var(--lp-text-secondary);
  text-align: left;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
.lp-navbar-locale-item:hover {
  background: var(--lp-bg-alt);
  color: var(--lp-text);
}
.lp-navbar-locale-item.active {
  color: var(--lp-primary);
}

/* ---- 反馈下拉 ---- */
.lp-navbar-feedback {
  position: relative;
}
.lp-navbar-feedback-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
}
.lp-navbar-feedback-chevron {
  transition: transform 0.25s ease;
  color: var(--lp-text-secondary);
}
.lp-navbar-feedback-chevron.open {
  transform: rotate(180deg);
}
.lp-navbar-feedback-menu {
  position: absolute;
  top: 100%;
  right: -12px;
  margin-top: 8px;
  min-width: 150px;
  padding: 6px;
  background: var(--lp-bg);
  border: 1px solid var(--lp-border);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}
.dark .lp-navbar-feedback-menu {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
.lp-navbar-feedback-item {
  font-size: 13px;
  font-weight: 500;
  color: var(--lp-text-secondary);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}
.lp-navbar-feedback-item:hover {
  background: var(--lp-bg-alt);
  color: var(--lp-text);
}

/* ---- 下拉动画 ---- */
.feedback-drop-enter-active {
  animation: feedback-drop-in 0.2s ease both;
}
.feedback-drop-leave-active {
  animation: feedback-drop-in 0.15s ease reverse both;
}
@keyframes feedback-drop-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
