<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { createTab } from '@/logic/util'

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
  <NPopover trigger="hover">
    <template #trigger>
      <NButton
        text
        class="tips__btn"
        @click="onClick()"
      >
        <Icon
          :icon="ICONS.questionBold"
          class="btn__icon"
        />
      </NButton>
    </template>

    <p class="tips-content">
      {{ `${link ? `${$t('prompts.linkTips')}\n ` : ''}${props.content}` }}
    </p>
  </NPopover>
</template>

<style scoped>
.tips-content {
  white-space: pre-line;
}
.tips__btn {
  width: 30px;
  .btn__icon {
    font-size: 14px;
  }
}
</style>
