<template>
  <NModal :show="globalState.isSponsorModalVisible" :mask-closable="false">
    <NCard class="card__wrap" :title="`${$t('sponsor.title')} ☕️`">
      <p class="modal__content">
        {{ $t('sponsor.content') }}
      </p>
      <div class="modal__code">
        <div v-for="payment in paymentList" :key="payment" class="code__item">
          <div class="item__img">
            <img class="img__main" :src="`/assets/img/sponsor/${payment}.png`" alt="">
          </div>
          <p class="item__title">
            {{ $t(`sponsor.${payment}`) }}
          </p>
        </div>
      </div>
      <div class="card__footer">
        <NButton class="footer__btn" type="primary" ghost size="small" @click="onCloseModal()">
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

<script setup lang="ts">
import { globalState } from '@/logic'

const paymentList = ['alipay', 'wechat']

const onCloseModal = () => {
  globalState.isSponsorModalVisible = false
}
</script>

<style scoped>
.card__wrap {
  width: 500px;
}
.modal__content {
  height: auto;
}
.modal__code {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin: 15px 0;
  .code__item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 40%;
    .item__img {
      .img__main {
        width: 100%;
      }
    }
    .item__title {
      text-align: center;
      opacity: 0.7;
    }
  }
}

.card__footer {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  .footer__btn {
    margin: 0 10px;
    .icon__wrap {
      font-size: 14px;
    }
  }
}
</style>
