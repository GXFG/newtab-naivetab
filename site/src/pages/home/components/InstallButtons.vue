<script setup lang="ts">
import { withBase } from '@site/utils/withBase'

const stores = [
  {
    key: 'chrome',
    name: 'Chrome',
    icon: withBase('/images/icon/chrome.png'),
    url: 'https://chromewebstore.google.com/detail/naivetab-%E5%8F%AF%E8%A7%86%E5%8C%96%E9%94%AE%E7%9B%98%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/hhfebdcoeoddbdhgcgflblcjcgogijem',
  },
  {
    key: 'edge',
    name: 'Edge',
    icon: withBase('/images/icon/edge.png'),
    url: 'https://microsoftedge.microsoft.com/addons/detail/naivetab-%E5%8F%AF%E8%A7%86%E5%8C%96%E9%94%AE%E7%9B%98%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/kejadmppkffccjopodhekdnmkofidmjl',
  },
  {
    key: 'firefox',
    name: 'Firefox',
    icon: withBase('/images/icon/firefox.png'),
    url: 'https://addons.mozilla.org/zh-CN/firefox/addon/naivetab-%E5%8F%AF%E8%A7%86%E5%8C%96%E9%94%AE%E7%9B%98%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/',
  },
]
</script>

<template>
  <div class="lp-install">
    <a
      v-for="store in stores"
      :key="store.key"
      :href="store.url"
      class="lp-install-btn"
      :class="`lp-install-btn--${store.key}`"
      target="_blank"
      :aria-label="`${store.name} ${$t('nav.install')}`"
    >
      <img
        :src="store.icon"
        :alt="store.name"
        class="lp-install-btn-icon"
      />
      <span class="lp-install-btn-text">{{ store.name }}</span>
      <span class="lp-install-btn-label">{{ $t('nav.install') }}</span>
    </a>
  </div>
</template>

<style scoped>
/* ---- 容器 ---- */
.lp-install {
  display: inline-flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ---- 按钮 ---- */
.lp-install-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  font-family: inherit;
  cursor: pointer;
  border-radius: 999px;
  border: 1px solid var(--lp-border);
  background: var(--lp-bg);
  color: var(--lp-text);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.lp-install-btn:hover {
  border-color: var(--lp-primary);
  box-shadow: 0 4px 16px rgb(99 102 241 / 0.1);
  transform: scale(1.04);
}
.dark .lp-install-btn:hover {
  box-shadow: 0 4px 16px rgb(129 140 248 / 0.15);
}

.lp-install-btn-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: block;
}
.lp-install-btn-text {
  font-weight: 600;
}
.lp-install-btn-label {
  color: var(--lp-text-secondary);
  font-size: 13px;
  margin-left: 2px;
}

/* 各浏览器品牌色（hover 时微透） */
.lp-install-btn--chrome:hover {
  border-color: #4285f4;
  background: #f8faff;
}
.lp-install-btn--edge:hover {
  border-color: #0078d4;
  background: #f5f9fd;
}
.lp-install-btn--firefox:hover {
  border-color: #ff6611;
  background: #fef9f6;
}
</style>
