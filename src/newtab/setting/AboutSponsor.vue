<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import { useStorage } from '@vueuse/core'
import BaseComponentCardTitle from '@/newtab/components/form/BaseComponentCardTitle.vue'
import AboutSponsorToastItem from './AboutSponsorToastItem.vue'

const paymentList = ['wechat', 'alipay']

const groupList = ['wechat', 'qq']

const catCounter = useStorage('naivetab-cat-counter', 0)
const toasts = ref<{ id: string, message: string }[]>([])

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
  <BaseComponentCardTitle :title="$t('sponsor.title')" />

  <div class="sponsor__content">
    <p class="content__item">{{ $t('sponsor.content1') }}</p>
    <p class="content__item">{{ $t('sponsor.content2') }}</p>
    <p class="content__item">{{ $t('sponsor.content3') }}</p>
    <p class="content__item">{{ $t('sponsor.content4') }}</p>
    <p class="content__item">{{ $t('sponsor.content5') }}</p>
    <p class="content__item content__item--center">{{ $t('sponsor.content6') }}</p>
  </div>

  <div class="sponsor__code">
    <div
      v-for="payment in paymentList"
      :key="payment"
      class="code__item"
    >
      <div class="item__img">
        <img
          class="img__main"
          :src="`/assets/img/sponsor/${payment}.jpg`"
          alt=""
        />
      </div>
      <p class="item__title">
        {{ $t(`sponsor.${payment}`) }}
      </p>
    </div>
  </div>

  <div class="sponsor__footer">
    <div class="footer__toast">
      <div class="toast__wrapper">
        <AboutSponsorToastItem
          v-for="toast in toasts"
          :key="toast.id"
          :message="toast.message"
          @remove="removeToast(toast.id)"
        />
      </div>

      <NButton
        class="footer__next"
        type="primary"
        size="small"
        ghost
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
</template>

<style scoped>
.sponsor__content {
  height: auto;
  .content__item {
    margin: 10px 0;
  }
  .content__item--center {
    text-align: center;
  }
}

.sponsor__code {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 40px;
  .code__item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 35%;
    .item__img {
      width: 165px;
      min-height: 165px;
      .img__main {
        width: 100%;
      }
    }
    .item__title {
      text-align: center;
      opacity: 0.8;
    }
  }
}

.sponsor__footer {
  display: flex;
  justify-content: center;
  margin-top: 15px;
  .footer__toast {
    position: relative;
    .toast__wrapper {
      position: absolute;
      top: -120px;
      left: 50%;
      transform: translateX(-50%);
      height: 150px;
      overflow: hidden;
      pointer-events: none;
      z-index: 9999;
    }
  }
  .footer__next {
    position: relative;
    font-size: 14px;
    transition: transform 0.2s ease;
    &:active {
      transform: scale(0.95);
    }
    &::after {
      content: '✨';
      position: absolute;
      right: -8px;
      top: -8px;
      font-size: 22px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    &:hover::after {
      opacity: 1;
    }
  }
}
</style>
