<script setup lang="ts">
/**
 * NTSwitch — NaiveTab 开关组件
 *
 * 基于 Reka UI Switch 二次封装，与 Naive UI NSwitch 核心 API 保持一致。
 * 样式由 src/styles/reka/switch.css 中的 .reka-switch 系列类控制，
 * 支持浅色/深色模式自动切换。
 *
 * @example
 * <NTSwitch v-model:value="enabled" />
 * <NTSwitch v-model:value="enabled" type="error" />
 * <NTSwitch v-model:value="enabled" disabled />
 * <NTSwitch v-model:value="enabled" loading />
 */
import { SwitchRoot, SwitchThumb } from 'reka-ui'

defineProps<{
  type?: 'default' | 'error'
  disabled?: boolean
  loading?: boolean
}>()

const checked = defineModel<boolean>('value', { required: true })
</script>

<template>
  <SwitchRoot
    v-model="checked"
    :disabled="disabled || loading"
    class="reka-switch reka-focus-visible"
    :class="`reka-switch--${type ?? 'default'}`"
    :data-loading="loading ? 'true' : undefined"
  >
    <SwitchThumb class="reka-switch__thumb" />
  </SwitchRoot>
</template>
