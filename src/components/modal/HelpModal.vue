<template>
  <NModal :show="state.isHelpVisible" :mask-closable="false">
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
import { useStorageLocal } from '@/composables/useStorageLocal'
import { isDragMode, addKeyboardTask } from '@/logic'

const isOpenHelpVisible = ref(useStorageLocal('data-help-modal', true))

const state = reactive({
  isHelpVisible: false,
})

const keyboardHandler = (e: KeyboardEvent) => {
  const { key } = e
  if (['?', '/'].includes(key)) {
    state.isHelpVisible = true
  }
}

addKeyboardTask('help-modal', keyboardHandler)

const onCloseModal = () => {
  state.isHelpVisible = false
}

watch(
  isDragMode,
  (value) => {
    if (!value) {
      return
    }
    if (!isOpenHelpVisible.value) {
      return
    }
    state.isHelpVisible = true
    isOpenHelpVisible.value = false
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
