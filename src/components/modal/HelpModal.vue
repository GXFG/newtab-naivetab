<template>
  <NModal :show="globalState.isHelpModalVisible" :mask-closable="false">
    <NCard class="card__wrap" :title="`📝 ${$t('help.title')}`">
      <p class="card__content">
        {{ $t('help.content') }}
      </p>
      <div class="card__footer">
        <NButton class="footer__btn" type="primary" ghost size="small" @click="onCloseModal()">
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
import { localState, globalState, isDragMode, addKeyboardTask } from '@/logic'

const keyboardHandler = (e: KeyboardEvent) => {
  const { key } = e
  if (['?'].includes(key)) {
    globalState.value.isHelpModalVisible = true
  }
}

addKeyboardTask('help-modal', keyboardHandler)

const onCloseModal = () => {
  globalState.value.isHelpModalVisible = false
}

watch(
  isDragMode,
  (value) => {
    if (!value) {
      return
    }
    if (!localState.common.isFirstOpen) {
      return
    }
    globalState.value.isHelpModalVisible = true
    localState.common.isFirstOpen = false
  },
  { immediate: true },
)
</script>

<style scoped>
.card__wrap {
  width: 500px;
}
.card__content {
  white-space: pre-line;
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
