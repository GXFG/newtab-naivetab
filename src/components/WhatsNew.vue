<template>
  <NModal :show="globalState.state.isWhatsNewModalVisible" :mask-closable="false">
    <NCard class="card__wrap" :title="`🌟 ${$t('common.whatsNew')}`">
      <Currentlog />
      <div class="card__footer">
        <NButton
          class="footer__btn"
          type="warning"
          ghost
          size="small"
          :disabled="isDisableCloseBtn"
          :loading="isDisableCloseBtn"
          @click="closeWhatsNewModal()"
        >
          <template #icon>
            <div class="icon__wrap">
              <ri:close-circle-line />
            </div>
          </template>
          Close
        </NButton>
        <NButton class="footer__btn" type="primary" ghost size="small" @click="openNewPage(URL_CHANGELOG)">
          <template #icon>
            <div class="icon__wrap">
              <gg:more-o class="btn__icon" />
            </div>
          </template>
          more
        </NButton>
      </div>
    </NCard>
  </NModal>
</template>

<script setup lang="ts">
import { NModal, NCard, NButton } from 'naive-ui'
import Currentlog from '../../CURRENTLOG.md'
import { URL_CHANGELOG, globalState, openNewPage, closeWhatsNewModal } from '@/logic'

const isDisableCloseBtn = ref(true)

setTimeout(() => {
  isDisableCloseBtn.value = false
}, 3000)
</script>

<style scoped>
.card__wrap {
  width: 500px;
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
