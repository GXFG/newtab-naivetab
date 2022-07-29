<template>
  <NPopover trigger="hover">
    <template #trigger>
      <NButton text class="tips__btn" @click="onClick()">
        <ph:question-bold class="btn__icon" />
      </NButton>
    </template>
    <p class="tips-content">
      {{ `${link ? $t('prompts.linkTips') + '\n ' : ''}${props.content}` }}
    </p>
  </NPopover>
</template>

<script setup lang="ts">
import { createTab } from '@/logic'

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

<style scoped>
.tips-content {
  white-space: pre-line;
}
.tips__btn {
  margin-left: 8px;
  .btn__icon {
    font-size: 14px;
  }
}
</style>
