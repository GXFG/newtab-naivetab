<script setup lang="ts">
import { globalState, isFirstOpen } from '@/logic'

const onShowTips = () => {
  window.$notification.warning({
    title: window.$t('guide.tipsTitle'),
    content: window.$t('guide.tipsContent'),
    duration: 10000,
  })
}

const onConfirm = () => {
  if (!isFirstOpen.value) {
    globalState.isUserGuideModalVisible = false
    return
  }
  // 首次关闭时弹出引导提示
  window.$dialog.warning({
    title: window.$t('guide.tipsTitle'),
    content: window.$t('guide.backContent'),
    positiveText: window.$t('common.confirm'),
    negativeText: window.$t('common.cancel'),
    maskClosable: false,
    onPositiveClick: () => {
      globalState.isUserGuideModalVisible = false
      isFirstOpen.value = false
      onShowTips()
    },
  })
}
</script>

<template>
  <NModal :show="globalState.isUserGuideModalVisible" :mask-closable="false">
    <NCard class="card__wrap" :title="`📝 ${$t('guide.title')}`">
      <div class="modal__content">
        <p v-for="index in [...Array(8).keys()]" :key="index">
          {{ $t(`guide.text${index}`) }}
        </p>
      </div>
      <div class="card__footer">
        <NButton class="footer__btn" type="primary" ghost size="small" @click="onConfirm()">
          <template #icon>
            <div class="icon__wrap">
              <ic:outline-check-circle />
            </div>
          </template>
          {{ $t('common.confirm') }}
        </NButton>
      </div>
    </NCard>
  </NModal>
</template>

<style scoped>
.card__wrap {
  width: 600px;
}

.card__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  .footer__btn {
    margin: 0 10px;
  }
}
</style>
