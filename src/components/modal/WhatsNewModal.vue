<template>
  <NModal :show="globalState.isWhatsNewModalVisible" :mask-closable="false">
    <NCard class="card__wrap" :title="`${$t('common.whatsNew')}`">
      <div class="card__content">
        <Currentlog />
      </div>
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
          {{ $t('common.close') }}
        </NButton>
        <NButton class="footer__btn" type="primary" ghost size="small" @click="createTab(URL_CHANGELOG)">
          <template #icon>
            <div class="icon__wrap">
              <gg:more-o class="btn__icon" />
            </div>
          </template>
          {{ $t('common.more') }}
        </NButton>
      </div>
    </NCard>
  </NModal>
</template>

<script setup lang="ts">
import Currentlog from '../../../CHANGELOG.md'
import { URL_CHANGELOG, globalState, createTab, closeWhatsNewModal } from '@/logic'

const isDisableCloseBtn = ref(true)

setTimeout(() => {
  isDisableCloseBtn.value = false
}, 3000)
</script>

<style scoped>
.card__wrap {
  width: 500px;
}
.card__content {
  height: 30vh;
  overflow-y: scroll;
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
