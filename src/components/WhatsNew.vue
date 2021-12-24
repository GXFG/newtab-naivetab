<template>
  <NModal v-model:show="globalState.state.isWhatsNewModalVisible" preset="dialog" :title="$t('common.whatsNew')">
    <Currentlog />
    <div class="modal__footer">
      <NButton text class="footer__btn" title="more" @click="openNewPage(URL_CHANGELOG)">
        <gg:more-o />
      </NButton>
    </div>
  </NModal>
</template>

<script setup lang="ts">
import { NModal, NButton } from 'naive-ui'
import Currentlog from '../../CURRENTLOG.md'
import { URL_CHANGELOG, globalState, openNewPage } from '@/logic'
</script>

<style scoped>
.modal__footer {
  display: flex;
  justify-content: flex-end;
  .footer__btn {
    font-size: 20px;
  }
}
</style>
