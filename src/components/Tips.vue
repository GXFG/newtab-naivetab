<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { createTab } from '@/logic/utils/common'

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
  link: {
    type: Boolean,
    default: false,
  },
})

const onClick = () => {
  if (!props.link) {
    return
  }
  createTab(props.content)
}
</script>

<template>
  <NTPopover trigger="hover">
    <template #trigger>
      <NTButton
        variant="text"
        class="tips__btn"
        @click="onClick()"
      >
        <Icon
          :icon="ICONS.info"
          class="btn__icon"
        />
      </NTButton>
    </template>

    <p class="tips-content">
      {{ `${link ? `${$t('prompts.linkTips')}\n ` : ''}${props.content}` }}
    </p>
  </NTPopover>
</template>

<style scoped>
.tips-content {
  white-space: pre-line;
}
.tips__btn {
  .btn__icon {
    font-size: 14px;
  }
}
</style>
