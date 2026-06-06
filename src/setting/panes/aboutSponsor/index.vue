<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useStorage } from '@vueuse/core'
import { ICONS } from '@/logic/constants/icons'
import { SettingHeaderBar } from '@/setting/components'
import SponsorToastItem from './SponsorToastItem.vue'

const paymentList = ['wechat', 'alipay']

const catCounter = useStorage('naivetab-cat-counter', 0)
const toasts = ref<{ id: string; message: string }[]>([])

const catEmojis = ['🐱', '😸', '😹', '😺', '😻', '😼', '😽']
const randomCat = () => catEmojis[Math.floor(Math.random() * catEmojis.length)]

const onNextTime = () => {
  catCounter.value += 1
  toasts.value.push({
    id: crypto.randomUUID(),
    message: `${randomCat()} ${window.$t('about.cannedHope')} +${catCounter.value}`,
  })
}

const removeToast = (id: string) => {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}
</script>

<template>
  <SettingHeaderBar :title="$t('sponsor.title')" />

  <div class="setting__pane-content">
    <!-- 文案卡片 -->
    <div class="sponsor__intro">
      <div class="intro__lines">
        <p class="intro__line">{{ $t('sponsor.content1') }}</p>
        <p class="intro__line">{{ $t('sponsor.content2') }}</p>
        <p class="intro__line">{{ $t('sponsor.content3') }}</p>
        <p class="intro__line">{{ $t('sponsor.content4') }}</p>
        <p class="intro__line">{{ $t('sponsor.content5') }}</p>
      </div>
      <p class="intro__highlight">{{ $t('sponsor.content6') }}</p>
    </div>

    <!-- 二维码区域 -->
    <div class="sponsor__qr-row">
      <div
        v-for="payment in paymentList"
        :key="payment"
        class="qr__card"
        :class="`qr__card--${payment}`"
      >
        <div class="qr__img-wrap">
          <img
            class="qr__img"
            :src="`/assets/img/sponsor/${payment}.jpg`"
            alt=""
          />
          <div class="qr__shine" />
        </div>
        <div class="qr__label">
          <span class="label__dot" />
          {{ $t(`sponsor.${payment}`) }}
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="sponsor__footer">
      <div class="footer__toast-area">
        <div class="toast__stack">
          <SponsorToastItem
            v-for="toast in toasts"
            :key="toast.id"
            :message="toast.message"
            @remove="removeToast(toast.id)"
          />
        </div>

        <NTButton
          type="primary"
          size="small"
          variant="secondary"
          @click="onNextTime"
        >
          <div class="icon__wrap">
            <Icon :icon="ICONS.faceSadCry" />
          </div>
          {{ $t('sponsor.confirm') }}
        </NTButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Intro ── */
.sponsor__intro {
  position: relative;
  margin: 8px 0 16px;
  padding: 18px 20px;
  border-radius: var(--radius-xl);
  border: 1px solid color-mix(in srgb, var(--nt-accent-brand) 10%, transparent);
  background:
    radial-gradient(
      ellipse at 85% 20%,
      color-mix(in srgb, var(--nt-accent-brand) 5%, transparent) 0%,
      transparent 50%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--nt-accent-brand) 4%, transparent) 0%,
      color-mix(in srgb, var(--nt-accent-brand) 1%, transparent) 100%
    );
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 4px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;

  /* 左侧渐变装饰条 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 18px;
    bottom: 18px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--nt-accent-brand);
    opacity: 0.35;
  }

  /* 右下角光晕 */
  &::after {
    content: '';
    position: absolute;
    right: -24px;
    bottom: -24px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: radial-gradient(
      circle at center,
      color-mix(in srgb, var(--nt-accent-brand) 7%, transparent) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  .intro__lines {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: 1;
  }

  .intro__line {
    font-size: var(--text-base);
    line-height: 1.65;
    opacity: var(--opacity-primary);
    padding-left: 16px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--nt-accent-brand) 45%, transparent);
      box-shadow: 0 0 4px
        color-mix(in srgb, var(--nt-accent-brand) 20%, transparent);
    }
  }

  .intro__highlight {
    position: relative;
    z-index: 1;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--nt-gray-light);
    text-align: center;
    font-size: var(--text-base);
    font-weight: 600;
    background: linear-gradient(90deg, var(--nt-accent-brand), #18a058);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 0.3px;
  }
}

/* ── QR Row ── */
.sponsor__qr-row {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 16px 0;
}

.qr__card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 18px 16px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--nt-gray-minimal);
  background: linear-gradient(
    160deg,
    var(--nt-gray-ghost) 0%,
    var(--nt-gray-ghost) 100%
  );
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.05),
    0 12px 32px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: default;
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    transform var(--transition-spring);

  /* 顶部品牌色装饰条 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20px;
    right: 20px;
    height: 2px;
    border-radius: 0 0 2px 2px;
    opacity: 0.4;
    transition: opacity var(--transition-base);
  }

  &.qr__card--wechat::before {
    background: linear-gradient(
      90deg,
      transparent,
      #09bb07 25%,
      #09bb07 75%,
      transparent
    );
  }

  &.qr__card--alipay::before {
    background: linear-gradient(
      90deg,
      transparent,
      #1677ff 25%,
      #1677ff 75%,
      transparent
    );
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.06),
      0 8px 20px rgba(0, 0, 0, 0.07),
      0 16px 40px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  &:hover::before {
    opacity: 0.65;
  }

  &.qr__card--wechat:hover {
    border-color: rgba(9, 187, 7, 0.25);
  }

  &.qr__card--alipay:hover {
    border-color: rgba(22, 119, 255, 0.25);
  }
}

.qr__img-wrap {
  position: relative;
  width: 148px;
  height: 148px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: transform var(--transition-spring);
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.04);

  .qr__card:hover & {
    transform: scale(1.03);
  }

  .qr__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: var(--radius-lg);
  }

  .qr__shine {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-lg);
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.12) 0%,
      transparent 55%
    );
    pointer-events: none;
  }

  /* 扫描线 */
  &::after {
    content: '';
    position: absolute;
    left: 5%;
    width: 90%;
    height: 16px;
    top: -16px;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(255, 255, 255, 0.06) 25%,
      rgba(255, 255, 255, 0.5) 50%,
      rgba(255, 255, 255, 0.06) 75%,
      transparent 100%
    );
    border-radius: 50%;
    box-shadow:
      0 0 10px rgba(255, 255, 255, 0.3),
      0 0 24px rgba(255, 255, 255, 0.12);
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
  }

  .qr__card:hover &::after {
    opacity: 1;
    animation: qrScan 1.2s ease-in-out;
  }
}

.qr__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 500;
  opacity: var(--opacity-secondary);
  letter-spacing: 0.4px;
}

.label__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: box-shadow var(--transition-base);

  .qr__card--wechat & {
    background: #09bb07;
    box-shadow: 0 0 5px rgba(9, 187, 7, 0.3);
  }

  .qr__card--alipay & {
    background: #1677ff;
    box-shadow: 0 0 5px rgba(22, 119, 255, 0.3);
  }

  .qr__card--wechat:hover & {
    box-shadow: 0 0 8px rgba(9, 187, 7, 0.5);
  }

  .qr__card--alipay:hover & {
    box-shadow: 0 0 8px rgba(22, 119, 255, 0.5);
  }
}

/* ── Footer ── */
.sponsor__footer {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding-bottom: 4px;
}

.footer__toast-area {
  position: relative;
  display: flex;
  justify-content: center;
}

.toast__stack {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  height: 150px;
  overflow: hidden;
  pointer-events: none;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

/* ── Keyframes ── */
@keyframes qrScan {
  0% {
    top: -16px;
  }
  100% {
    top: 100%;
  }
}
</style>
