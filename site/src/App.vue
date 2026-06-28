<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import HomeNavbar from './pages/home/components/Navbar.vue'
import HomeFooter from './pages/home/components/Footer.vue'

const progress = ref(0)
let ticking = false
function onScroll() {
  if (ticking) return
  requestAnimationFrame(() => {
    const h = document.documentElement.scrollHeight - window.innerHeight
    progress.value = h > 0 ? window.scrollY / h : 0
    ticking = false
  })
  ticking = true
}
window.addEventListener('scroll', onScroll, { passive: true })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <!-- 全局滚动进度条 -->
  <div
    class="lp-progress-bar"
    :style="{ transform: `scaleX(${progress})` }"
    aria-hidden="true"
  />
  <div class="lp-page">
    <HomeNavbar />
    <main>
      <router-view />
    </main>
    <HomeFooter />
  </div>
</template>

<style>
/* ---- html/body 背景色（覆盖 overscroll 区域，深色模式下避免白色闪现） ---- */
body {
  background: #ffffff;
}
.dark body {
  background: #0c0a09;
}

/* ---- 全局滚动进度条 ---- */
.lp-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  z-index: 200;
  background: linear-gradient(90deg, #6366f1, #818cf8);
  transform-origin: left;
  transform: scaleX(0);
  will-change: transform;
  pointer-events: none;
}
.dark .lp-progress-bar {
  background: linear-gradient(90deg, #818cf8, #a5b4fc);
}

/* ============================================================
 * CSS 变量体系
 * ============================================================ */
.lp-page {
  --lp-primary: #6366f1;
  --lp-primary-hover: #4f46e5;
  --lp-primary-light: #eef2ff;
  --lp-bg: #ffffff;
  --lp-bg-alt: #f5f5f4;
  --lp-text: #1c1917;
  --lp-text-secondary: #78716c;
  --lp-border: #e7e5e4;
  --lp-max-width: 1200px;
  --lp-radius: 16px;
  --lp-section-py: 100px;

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  color: var(--lp-text);
  background: var(--lp-bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ============================================================
 * 深色模式
 * ============================================================ */
.dark .lp-page {
  --lp-primary: #818cf8;
  --lp-primary-hover: #6366f1;
  --lp-primary-light: #1e1b4b;
  --lp-bg: #0c0a09;
  --lp-bg-alt: #1c1917;
  --lp-text: #f5f5f4;
  --lp-text-secondary: #a8a29e;
  --lp-border: #292524;
}

/* ============================================================
 * 全局重置
 * ============================================================ */
.lp-page *,
.lp-page *::before,
.lp-page *::after {
  box-sizing: border-box;
}

.lp-page a {
  color: var(--lp-primary);
  text-decoration: none;
  transition: color 0.2s;
}
.lp-page a:hover {
  color: var(--lp-primary-hover);
}

.lp-page img {
  max-width: 100%;
  height: auto;
}

.lp-page .lp-container {
  max-width: var(--lp-max-width);
  margin: 0 auto;
  padding: 0 24px;
}

/* ============================================================
 * 渐变质感体系 — 极简单色（同色相、明度/饱和度微变）
 * 初见干净，细看处处有光。
 * ============================================================ */

/* ---- 区块交替微渐变 ---- */
.lp-section--gradient-alt {
  background:
    var(--lp-bg-alt)
    linear-gradient(
      180deg,
      rgb(99 102 241 / 0.06) 0%,
      transparent 35%,
      transparent 65%,
      rgb(99 102 241 / 0.05) 100%
    );
}

.dark .lp-section--gradient-alt {
  background:
    var(--lp-bg-alt)
    linear-gradient(
      180deg,
      rgb(129 140 248 / 0.12) 0%,
      transparent 35%,
      transparent 65%,
      rgb(129 140 248 / 0.1) 100%
    );
}

/* ---- 卡片微光边框（hover 时渐变光泽） ---- */
.lp-card--glow {
  border: 1px solid var(--lp-border);
  transition: border-color 0.3s, box-shadow 0.3s, background 0.3s;
}
.lp-card--glow:hover {
  border-color: transparent;
  background:
    linear-gradient(var(--lp-bg), var(--lp-bg)) padding-box,
    linear-gradient(
      135deg,
      rgb(99 102 241 / 0.12),
      transparent 55%,
      rgb(99 102 241 / 0.08)
    ) border-box;
  box-shadow: 0 2px 24px rgb(99 102 241 / 0.06);
}

.dark .lp-card--glow:hover {
  background:
    linear-gradient(var(--lp-bg), var(--lp-bg)) padding-box,
    linear-gradient(
      135deg,
      rgb(129 140 248 / 0.18),
      transparent 55%,
      rgb(129 140 248 / 0.1)
    ) border-box;
  box-shadow: 0 2px 24px rgb(129 140 248 / 0.1);
}

/* ---- 标题渐变文字（同色相 indigo 明度过渡） ---- */
.lp-title--gradient {
  background: linear-gradient(135deg, #5b21b6 0%, #6366f1 50%, #818cf8 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dark .lp-title--gradient {
  background: linear-gradient(135deg, #a5b4fc 0%, #c7d2fe 50%, #ddd6fe 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
