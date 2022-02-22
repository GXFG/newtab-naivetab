<template>
  <NModal :show="globalState.isWhatsNewModalVisible" :mask-closable="false">
    <NCard class="card__wrap" :title="`✨${$t('common.whatsNew')}✨`">
      <div class="modal__content">
        <Currentlog />
      </div>
      <div class="card__footer">
        <NButton
          class="footer__btn"
          type="primary"
          ghost
          size="small"
          :loading="globalState.isClearStorageLoading"
          @click="onClose()"
        >
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
import { globalState, closeWhatsNewModal, refreshSetting } from '@/logic'

const onClose = async() => {
  if (globalState.value.isWhatsNewModalCloseToRefresh) {
    await refreshSetting()
  }
  closeWhatsNewModal()
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
