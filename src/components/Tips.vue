<template>
  <NTooltip triger="hover" placement="top-end">
    <template #trigger>
      <NButton text class="tips__btn" @click="onClick()">
        <ph:question-bold class="btn__icon" />
      </NButton>
    </template>
    {{ `${link ? $t('common.formatTips') : ''}${props.content}` }}
  </NTooltip>
</template>

<script setup lang="ts">
import { NButton, NTooltip } from 'naive-ui'

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
  window.open(props.content)
}

</script>

<style scoped>
.tips__btn {
  margin-left: 8px;
  .btn__icon {
    font-size: 14px;
  }
}
</style>
