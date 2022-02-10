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

const onClose = () => {
  if (globalState.value.isWhatsNewModalCloseToRefresh) {
    refreshSetting()
    return
  }
  closeWhatsNewModal()
}
</script>

<style scoped>
.card__wrap {
  width: 500px;
}
.card__content {
  height: 30vh;
  overflow-y: scroll;
  &::-webkit-scrollbar {
    width: 10px;
  }
  &::-webkit-scrollbar-thumb {
    background: #808080;
    border-radius: 5px;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  }
  &::-webkit-scrollbar-track {
    background: #ccc;
    border-radius: 5px;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  }
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
