<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { defineAsyncComponent } from 'vue'
import { globalState } from '@/logic/store'

const modules = import.meta.glob('../../CHANGELOG.md')
const ChangeLogMd = modules['../../CHANGELOG.md'] ? defineAsyncComponent(modules['../../CHANGELOG.md'] as any) : null

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
      :title="`🚀 ${$t('about.changelog')}`"
    >
      <div class="modal__content changelog__content">
        <ChangeLogMd v-if="ChangeLogMd" />
        <p v-else> - </p>
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
              <Icon :icon="ICONS.checkCircle" />
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
