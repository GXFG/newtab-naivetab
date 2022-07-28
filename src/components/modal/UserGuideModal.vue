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
              <line-md:confirm-circle />
            </div>
          </template>
          {{ $t('common.confirm') }}
        </NButton>
      </div>
    </NCard>
  </NModal>
</template>

<script setup lang="ts">
import { globalState, isFirstOpen } from '@/logic'

const onConfirm = () => {
  if (!isFirstOpen.value) {
    globalState.isUserGuideModalVisible = false
    return
  }
  window.$dialog.info({
    title: '确认关闭',
    content: '可通过点击鼠标右键找到该弹窗',
    positiveText: '确定',
    negativeText: '取消',
    maskClosable: false,
    onPositiveClick: () => {
      globalState.isUserGuideModalVisible = false
    },
  })
}
</script>

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
