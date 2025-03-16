<script setup lang="ts">
import { globalState } from '@/logic/store'
import ChangeLogMd from '../../CHANGELOG.md'

const onCloseModal = () => {
  globalState.isChangelogModalVisible = false
}
</script>

<template>
  <NModal
    :show="globalState.isChangelogModalVisible"
    :mask-closable="false"
  >
    <NCard
      class="card__wrap"
      :title="`🚀 ${$t('rightMenu.changelog')}`"
    >
      <div class="modal__content changelog__content">
        <ChangeLogMd />
      </div>

      <div class="card__footer">
        <NButton
          class="footer__btn"
          type="primary"
          size="small"
          ghost
          @click="onCloseModal()"
        >
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

<style scoped>
.card__wrap {
  width: 600px;
  .changelog__content {
    ::v-deep(h1) {
      display: none;
    }
    ::v-deep(h2) {
      margin: 15px 0 2px 0;
      font-size: 15px;
      font-weight: bold;
    }
  }
}

.card__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
  .footer__btn {
    margin: 0 10px;
  }
}
</style>
