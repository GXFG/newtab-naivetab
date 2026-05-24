<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import { useStorage } from '@vueuse/core'
import { SettingHeaderBar } from '@/setting/components'
import SponsorToastItem from './SponsorToastItem.vue'

const paymentList = ['wechat', 'alipay']

const groupList = ['wechat', 'qq']

const catCounter = useStorage('naivetab-cat-counter', 0)
const toasts = ref<{ id: string; message: string }[]>([])

const catEmojis = ['🐱', '😸', '😹', '😺', '😻', '😼', '😽']
const randomCat = () => catEmojis[Math.floor(Math.random() * catEmojis.length)]

const onNextTime = () => {
  catCounter.value += 1
  toasts.value.push({
    id: uuidv4(),
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

        <NButton
          class="footer__skip-btn setting__btn setting__btn--primary"
          type="primary"
          size="tiny"
          secondary
          @click="onNextTime"
        >
          <template #icon>
            <div class="icon__wrap">
              <fa6-regular:face-sad-cry />
            </div>
          </template>
          {{ $t('sponsor.confirm') }}
        </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Intro ── */
.sponsor__intro {
  margin: 14px 0 10px;
  padding: 14px 16px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--gray-alpha-08);
  background: linear-gradient(
    135deg,
    rgba(16, 152, 173, 0.04) 0%,
    transparent 60%
  );

  .intro__lines {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .intro__line {
    font-size: var(--text-base);
    line-height: 1.55;
    opacity: var(--opacity-primary);
    padding-left: 12px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: rgba(16, 152, 173, 0.6);
    }
  }

  .intro__highlight {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--gray-alpha-10);
    text-align: center;
    font-size: var(--text-base);
    font-weight: 600;
    background: linear-gradient(90deg, #1098ad, #18a058);
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
  gap: 24px;
  margin: 16px 0;
}

.qr__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 12px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--gray-alpha-08);
  background: var(--gray-alpha-05);
  box-shadow: var(--shadow-sm);
  transition:
    box-shadow var(--transition-base),
    border-color var(--transition-base),
    transform var(--transition-spring);

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  &.qr__card--wechat:hover {
    border-color: rgba(9, 187, 7, 0.35);
    box-shadow:
      var(--shadow-md),
      0 0 0 3px rgba(9, 187, 7, 0.06);
  }

  &.qr__card--alipay:hover {
    border-color: rgba(22, 119, 255, 0.35);
    box-shadow:
      var(--shadow-md),
      0 0 0 3px rgba(22, 119, 255, 0.06);
  }
}

.qr__img-wrap {
  position: relative;
  width: 148px;
  height: 148px;
  border-radius: var(--radius-lg);
  overflow: hidden;

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
      transparent 50%
    );
    pointer-events: none;
  }
}

.qr__label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-sm);
  font-weight: 500;
  opacity: var(--opacity-secondary);
  letter-spacing: 0.3px;
}

.label__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: currentColor;
  opacity: 0.5;

  .qr__card--wechat & {
    background: #09bb07;
    opacity: 1;
  }

  .qr__card--alipay & {
    background: #1677ff;
    opacity: 1;
  }
}

/* ── Footer ── */
.sponsor__footer {
  display: flex;
  justify-content: center;
  margin-top: 8px;
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

.footer__skip-btn {
  font-size: 14px;
  transition: transform var(--transition-spring);

  &:active {
    transform: scale(0.95);
  }

  &::after {
    content: '✨';
    position: absolute;
    right: -8px;
    top: -8px;
    font-size: 20px;
    opacity: 0;
    transition: opacity var(--transition-slow);
    pointer-events: none;
  }

  &:hover::after {
    opacity: 1;
  }
}
</style>
