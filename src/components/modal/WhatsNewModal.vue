<template>
  <NModal :show="globalState.isWhatsNewModalVisible" :mask-closable="false">
    <NCard class="card__wrap" :title="`✨${$t('common.whatsNew')}✨`">
      <div class="modal__content">
        <Currentlog />
      </div>
      <div class="card__footer">
        <NButton class="footer__btn" type="primary" ghost size="small" :loading="globalState.isClearStorageLoading" @click="onCloseModal()">
          <template #icon>
            <div class="icon__wrap">
              <ri:close-circle-line />
            </div>
          </template>
          {{ $t('common.close') }}
        </NButton>
      </div>
    </NCard>
  </NModal>
</template>

<script setup lang="ts">
import Currentlog from '../../../CHANGELOG.md'
import { globalState } from '@/logic'

const onCloseModal = () => {
  globalState.isWhatsNewModalVisible = false
}
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
