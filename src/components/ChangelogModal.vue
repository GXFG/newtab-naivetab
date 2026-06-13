<script setup lang="ts">
import { Icon } from '@iconify/vue'
import NTModal from '@/components/ui/NTModal.vue'
import NTNotice from '@/components/ui/NTNotice.vue'
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
    :title="$t('about.changelogTitle')"
    :width="600"
  >
    <template #body-header>
      <div
        v-if="showBreakingChangeNotice"
        class="changelog__notice"
      >
        <NTNotice
          type="warning"
          :content="$t('prompts.breakingChangeNotice')"
        />
      </div>
    </template>

    <ChangeLogMd
      v-if="ChangeLogMd"
      class="changelog__content"
    />
    <p v-else>-</p>

    <template #footer>
      <NTButton
        type="primary"
        size="tiny"
        variant="secondary"
        @click="onConfirm()"
      >
        <div class="icon__wrap">
          <Icon :icon="ICONS.checkCircle" />
        </div>
        {{ $t('common.confirm') }}
      </NTButton>
    </template>
  </NTModal>
</template>

<style scoped>
.changelog__content {
  white-space: pre-line;
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

.changelog__notice {
  margin: 13px 0;
}
</style>
