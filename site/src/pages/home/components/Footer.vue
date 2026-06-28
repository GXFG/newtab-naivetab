<script setup lang="ts">
import { withBase } from '@site/utils/withBase'
import {
  changelogLink,
  sponsorLink,
  issuesLink,
  emailLink,
  githubLink,
  licenseLink,
} from '@site/data/links'

const footerColumns = [
  {
    titleKey: 'footer.columns.project',
    links: [changelogLink, githubLink, licenseLink],
  },
  {
    titleKey: 'footer.columns.support',
    links: [issuesLink, emailLink, sponsorLink],
  },
]
</script>

<template>
  <footer class="lp-footer">
    <div class="lp-container">
      <div class="lp-footer-grid">
        <div class="lp-footer-brand">
          <div class="lp-footer-logo">
            <img :src="withBase('/images/logo.svg')" alt="NaiveTab" />
            <span>NaiveTab</span>
          </div>
          <p class="lp-footer-tagline">{{ $t('footer.tagline') }}</p>
        </div>

        <div
          v-for="col in footerColumns"
          :key="col.titleKey"
          class="lp-footer-col"
        >
          <h4 class="lp-footer-col-title">{{ $t(col.titleKey) }}</h4>
          <a
            v-for="link in col.links"
            :key="link.url"
            :href="link.url"
            class="lp-footer-col-link"
            target="_blank"
          >{{ $t(link.textKey) }}</a>
        </div>
      </div>

      <div class="lp-footer-bottom">
        <p>
          &copy; 2022 - {{ new Date().getFullYear() }} NaiveTab &middot; Made By GXFG
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.lp-footer {
  padding: 56px 0 24px;
  background: var(--lp-bg-alt);
  border-top: 1px solid var(--lp-border);
}
.lp-footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}
@media (max-width: 768px) {
  .lp-footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
}
@media (max-width: 480px) {
  .lp-footer-grid {
    grid-template-columns: 1fr;
  }
}
.lp-footer-brand {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.lp-footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 700;
  color: var(--lp-text);
}
.lp-footer-logo img {
  width: 24px;
  height: 24px;
}
.lp-footer-tagline {
  font-size: 13px;
  color: var(--lp-text-secondary);
  margin: 0;
  max-width: 240px;
  line-height: 1.6;
}
.lp-footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lp-footer-col-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--lp-text);
  margin: 0;
}
.lp-footer-col-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--lp-text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}
.lp-footer-col-link:hover {
  color: var(--lp-primary);
}
.lp-footer-bottom {
  border-top: 1px solid var(--lp-border);
  padding-top: 20px;
  text-align: center;
}
.lp-footer-bottom p {
  font-size: 12px;
  color: var(--lp-text-secondary);
  margin: 0;
}
</style>
