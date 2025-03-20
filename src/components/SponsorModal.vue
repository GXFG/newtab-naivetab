<script setup lang="ts">
import { globalState } from '@/logic/store'

const paymentList = ['wechat', 'alipay']

const groupList = ['wechat', 'qq']

const onCloseModal = () => {
  globalState.isSponsorModalVisible = false
}
</script>

<template>
  <NModal
    :show="globalState.isSponsorModalVisible"
    :mask-closable="false"
  >
    <NCard
      class="card__wrap"
      :title="`${$t('sponsor.title')}`"
    >
      <div class="modal__content">
        <p class="content__item">{{ $t('sponsor.content1') }}</p>
        <p class="content__item">{{ $t('sponsor.content2') }}</p>
        <p class="content__item">{{ $t('sponsor.content3') }}</p>
        <p class="content__item">{{ $t('sponsor.content4') }}</p>
        <p class="content__item">{{ $t('sponsor.content5') }}</p>
        <p class="content__item content__item--center">{{ $t('sponsor.content6') }}</p>
      </div>

      <div class="modal__code">
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

      <div class="modal__content">
        <p class="content__item">{{ `${$t('sponsor.contact1')}` }}</p>
        <p class="content__item content__item--center">{{ `${$t('sponsor.contact2')}` }}</p>
      </div>

      <div class="modal__code">
        <div
          v-for="group in groupList"
          :key="group"
          class="code__item"
        >
          <div class="item__img">
            <img
              class="img__main"
              :src="`https://github.com/GXFG/newtab-naivetab/blob/main/assets/img/sponsor/${group}-group.jpg?raw=true`"
              alt=""
            />
          </div>
          <p class="item__title">
            {{ $t(`sponsor.${group}`) }}
          </p>
        </div>
      </div>

      <div class="card__footer">
        <NButton
          class="footer__btn"
          type="primary"
          size="small"
          ghost
          @click="onCloseModal()"
        >
          <template #icon>
            <div class="icon__wrap">
              <fa6-regular:face-sad-cry />
            </div>
          </template>
          {{ $t('sponsor.confirm') }}
        </NButton>
      </div>
    </NCard>
  </NModal>
</template>

<style scoped>
.card__wrap {
  width: 650px;
}
.modal__content {
  height: auto;
  .content__item {
    margin: 10px 0;
  }
  .content__item--center {
    text-align: center;
  }
}
.modal__code {
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

.card__footer {
  display: flex;
  justify-content: center;
  margin-top: 15px;
  .footer__btn {
    margin: 0 10px;
    .icon__wrap {
      font-size: 14px;
    }
  }
}
</style>
