<script setup lang="ts">
import { Icon } from '@iconify/vue'
import NTModal from '@/components/ui/NTModal.vue'
import { ICONS } from '@/logic/constants/icons'
import { defineAsyncComponent, computed } from 'vue'
import { localConfig } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'

const modules = import.meta.glob('../../CHANGELOG.md')
const ChangeLogMd = modules['../../CHANGELOG.md']
  ? defineAsyncComponent(modules['../../CHANGELOG.md'] as any)
  : null

const showBreakingChangeNotice = computed(() => {
  return localConfig.general.showBreakingChangeNotice
})

const onConfirm = () => {
  if (showBreakingChangeNotice.value) {
    localConfig.general.showBreakingChangeNotice = false
  }
  globalState.isChangelogModalVisible = false
}
</script>

<template>
  <NTModal
    v-model:open="globalState.isChangelogModalVisible"
    :mask-closable="false"
  >
    <NTCard
      class="card__wrap"
      :title="$t('about.changelogTitle')"
    >
      <div
        v-if="showBreakingChangeNotice"
        class="breaking-notice"
      >
        <Icon
          :icon="ICONS.warning"
          class="notice__icon"
        />
        <div class="notice__content">
          {{ $t('prompts.breakingChangeNotice') }}
        </div>
      </div>

      <div class="modal__content changelog__content">
        <ChangeLogMd v-if="ChangeLogMd" />
        <p v-else>-</p>
      </div>

      <template #footer>
        <NTButton
          type="primary"
          size="small"
          variant="secondary"
          @click="onConfirm()"
        >
          <div class="icon__wrap">
            <Icon :icon="ICONS.checkCircle" />
          </div>
          {{ $t('common.confirm') }}
        </NTButton>
      </template>
    </NTCard>
  </NTModal>
</template>

<style scoped>
.card__wrap {
  width: 600px;
  .changelog__content {
    padding: 15px 0;
    :deep(h1) {
      display: none;
    }
    :deep(h2) {
      margin: 15px 0 2px 0;
      font-size: 15px;
      font-weight: bold;
    }
  }
}

.breaking-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  background-color: rgba(250, 173, 20, 0.08);
  border: 1px solid rgba(250, 173, 20, 0.3);
  border-radius: var(--radius-lg);
}

.notice__icon {
  flex-shrink: 0;
  font-size: 20px;
  color: #d97706;
}

:root[data-theme='dark'] .breaking-notice,
.dark .breaking-notice {
  background-color: rgba(250, 173, 20, 0.12);
  border-color: rgba(250, 173, 20, 0.4);
}

:root[data-theme='dark'] .notice__icon,
.dark .notice__icon {
  color: #f59e0b;
}

.notice__content {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.6;
}

:root[data-theme='dark'] .notice__content,
.dark .notice__content {
  color: rgba(255, 255, 255, 0.9);
}
</style>
