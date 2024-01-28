<script setup lang="ts">
import { globalState } from '@/logic/store'

const paymentList = ['wechat', 'alipay']

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
      :title="`${$t('sponsor.title')} ☕️`"
    >
      <div class="modal__content">
        <p class="content__item">{{ $t('sponsor.content1') }}</p>
        <p class="content__item">{{ $t('sponsor.content2') }}</p>
        <p class="content__item">{{ $t('sponsor.content3') }}</p>
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

      <div class="card__footer">
        <NButton
          class="footer__btn"
          type="primary"
          ghost
          size="small"
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
  width: 600px;
}
.modal__content {
  height: auto;
  .content__item {
    margin: 10px 0;
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
