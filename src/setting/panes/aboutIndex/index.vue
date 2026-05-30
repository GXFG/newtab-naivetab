<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { createTab } from '@/logic/utils/common'
import {
  URL_NAIVETAB_DOC_HOME,
  URL_GITHUB_HOME,
  URL_FEEDBACK_EMAIL,
} from '@/logic/constants/urls'
import { openUserGuide } from '@/logic/guide'
import { showToast } from '@/common/toast'
import {
  openChangelogModal,
  openExtensionsStorePage,
  globalState,
} from '@/logic/store/state'
import { SettingHeaderBar } from '@/setting/components'

const appVersion = computed(() => window.appVersion)

const handleOpenUserGuide = () => {
  if (globalState.settingMode === 'options') {
    showToast.info(window.$t('about.guideInNewtab'))
    return
  }
  openUserGuide()
}
</script>

<template>
  <SettingHeaderBar :title="$t('setting.aboutIndex')" />

  <div class="setting__pane-content">
    <!-- Hero 区域 -->
    <div class="about__hero">
      <div class="hero__bg-pattern" />
      <div class="hero__content">
        <div class="hero__icon-wrap">
          <div class="hero__icon-glow" />
          <img
            class="hero__icon-img"
            :src="'/assets/img/icon/icon.png'"
          />
        </div>
        <h1 class="hero__name">NaiveTab</h1>
        <p class="hero__tagline">{{ $t('about.tagline') }}</p>
        <div class="hero__version-badge">
          <span class="version__dot" />
          {{ appVersion }}
        </div>
      </div>
    </div>

    <!-- 用户帮助 -->
    <div class="about__section">
      <p class="section__label">
        <Icon
          :icon="ICONS.questionBold"
          class="label__icon"
        />
        {{ $t('about.userHelp') }}
      </p>
      <div class="section__grid">
        <button
          class="action__card"
          :title="$t('about.userDocs')"
          @click="createTab(URL_NAIVETAB_DOC_HOME)"
        >
          <span class="card__icon-wrap">
            <Icon
              :icon="ICONS.bookOutline"
              class="card__icon"
            />
          </span>
          <span class="card__label">{{ $t('about.userDocs') }}</span>
        </button>
        <button
          class="action__card"
          :title="$t('about.userGuide')"
          @click="handleOpenUserGuide"
        >
          <span class="card__icon-wrap">
            <Icon
              :icon="ICONS.devGuideOutline"
              class="card__icon"
            />
          </span>
          <span class="card__label">{{ $t('about.userGuide') }}</span>
        </button>
        <button
          class="action__card"
          :title="$t('about.changelog')"
          @click="openChangelogModal"
        >
          <span class="card__icon-wrap">
            <Icon
              :icon="ICONS.newReleases"
              class="card__icon"
            />
          </span>
          <span class="card__label">{{ $t('about.changelog') }}</span>
        </button>
      </div>
    </div>

    <!-- 反馈 -->
    <div class="about__section">
      <p class="section__label">
        <Icon
          :icon="ICONS.feedbackMsg"
          class="label__icon"
        />
        {{ $t('about.feedback') }}
      </p>
      <div class="section__grid">
        <button
          class="action__card"
          :title="$t('about.goodReview')"
          @click="openExtensionsStorePage()"
        >
          <span class="card__icon-wrap card__icon-wrap--primary">
            <Icon
              :icon="ICONS.thumbsUp"
              class="card__icon"
            />
          </span>
          <span class="card__label">{{ $t('about.goodReview') }}</span>
        </button>

        <button
          class="action__card"
          title="GitHub"
          @click="createTab(URL_GITHUB_HOME)"
        >
          <span class="card__icon-wrap">
            <Icon
              :icon="ICONS.githubLogo"
              class="card__icon"
            />
          </span>
          <!-- GitHub 为全球通用品牌名称，无需 i18n -->
          <span class="card__label">GitHub</span>
        </button>

        <button
          class="action__card"
          title="Email"
          @click="createTab(URL_FEEDBACK_EMAIL)"
        >
          <span class="card__icon-wrap">
            <Icon
              :icon="ICONS.emailOutline"
              class="card__icon"
            />
          </span>
          <!-- Email 为通用通讯方式名称，无需 i18n -->
          <span class="card__label">Email</span>
        </button>
      </div>
    </div>

    <!-- 版权声明为品牌展示需要，无需 i18n -->
    <p class="about__copyright">
      © {{ new Date().getFullYear() }} NaiveTab · All rights reserved.
    </p>
  </div>
</template>

<style scoped>
/* ── Hero ── */
.about__hero {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  margin: 8px 0 12px;
  background: linear-gradient(
    135deg,
    rgba(16, 152, 173, 0.08) 0%,
    rgba(16, 152, 173, 0.02) 100%
  );
  border: 1px solid rgba(16, 152, 173, 0.12);
}

.hero__bg-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(
      circle at 20% 80%,
      rgba(16, 152, 173, 0.06) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 80% 20%,
      rgba(16, 152, 173, 0.04) 0%,
      transparent 50%
    );
  pointer-events: none;
}

.hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px 28px;
  gap: 8px;
}

.hero__icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero__icon-glow {
  position: absolute;
  inset: -6px;
  border-radius: 24px;
  background: radial-gradient(
    circle at 50% 40%,
    rgba(16, 152, 173, 0.22),
    transparent 70%
  );
  filter: blur(8px);
  animation: glowPulse 3s ease-in-out infinite;
}

.hero__icon-img {
  width: 85px;
  height: 85px;
  border-radius: 18px;
  box-shadow:
    var(--shadow-lg),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  position: relative;
  z-index: 1;
  transition: transform var(--transition-spring);

  &:hover {
    transform: scale(1.05) rotate(-2deg);
  }
}

.hero__name {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
  font-family: 'Arial Rounded MT Bold', system-ui, sans-serif;
  margin: 0;
  line-height: 1.2;
}

.hero__tagline {
  font-size: var(--text-sm);
  opacity: var(--opacity-secondary);
  margin: 4px 0 8px;
  letter-spacing: 0.3px;
}

.hero__version-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--gray-alpha-08);
  font-size: var(--text-sm);
  opacity: var(--opacity-primary);
  font-family: 'SF Mono', 'Consolas', monospace;
  letter-spacing: 0.3px;
}

.version__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #18a058;
  flex-shrink: 0;
  box-shadow: 0 0 4px #18a05888;
  animation: dotBreath 2s ease-in-out infinite;
}

/* ── Section ── */
.about__section {
  margin: 0 0 6px;
  padding: 0 4px;
}

.section__label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 16px 2px 8px;
  font-size: var(--text-sm);
  font-weight: 600;
  opacity: var(--opacity-secondary);
  letter-spacing: 0.3px;
  text-transform: uppercase;

  .label__icon {
    font-size: 14px;
    flex-shrink: 0;
  }
}

.section__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

/* ── Action Card ── */
.action__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px 10px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--gray-alpha-08);
  background: var(--gray-alpha-03);
  cursor: pointer;
  transition:
    background-color var(--transition-base),
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    transform var(--transition-spring);
  outline: none;

  &:hover {
    background: rgba(16, 152, 173, 0.06);
    border-color: rgba(16, 152, 173, 0.3);
    box-shadow:
      var(--shadow-sm),
      0 0 0 3px rgba(16, 152, 173, 0.06);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97) translateY(0);
  }
}

.card__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  background: var(--gray-alpha-08);
  transition: background-color var(--transition-base);

  .action__card:hover & {
    background: rgba(16, 152, 173, 0.12);
  }
}

.card__icon-wrap--primary .card__icon {
  color: #18a058;
}

.card__icon {
  font-size: 16px;
  transition: transform var(--transition-spring);

  .action__card:hover & {
    transform: scale(1.15);
  }
}

.card__label {
  font-size: var(--text-sm);
  line-height: 1;
  white-space: nowrap;
  opacity: var(--opacity-primary);
}

/* ── Copyright ── */
.about__copyright {
  margin-top: 28px;
  margin-bottom: 8px;
  font-size: var(--text-xs);
  text-align: center;
  opacity: var(--opacity-muted);
  letter-spacing: 0.5px;
}

/* ── Animations ── */
@keyframes glowPulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@keyframes dotBreath {
  0%,
  100% {
    box-shadow: 0 0 4px #18a05888;
  }
  50% {
    box-shadow: 0 0 8px #18a058cc;
  }
}
</style>
