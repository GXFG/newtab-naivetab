<script setup lang="ts">
/**
 * NTNotice — NaiveTab 通知横幅组件
 *
 * 纯展示组件，用于 breaking change 提示、表单校验错误、
 * 操作成功反馈等信息展示场景。
 * 样式由 src/styles/reka/notice.css 中的 .reka-notice 系列类控制，
 * 支持浅色/深色模式自动切换。
 *
 * @example
 * <NTNotice type="warning" :content="$t('prompts.breakingChangeNotice')" />
 * <NTNotice type="info" content="这是一条信息提示" />
 * <NTNotice type="success" content="操作成功" />
 * <NTNotice type="error" :bordered="false" content="无边框错误提示" />
 */
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    content: string
    type?: 'warning' | 'info' | 'success' | 'error'
    bordered?: boolean
  }>(),
  {
    type: 'warning',
    bordered: true,
  },
)

const typeIconMap: Record<string, string> = {
  warning: ICONS.warning,
  info: ICONS.info,
  success: ICONS.checkCircle,
  error: ICONS.closeCircleLine,
}

const resolvedIcon = computed(() => typeIconMap[props.type])
</script>

<template>
  <div
    class="reka-notice"
    :class="{
      'reka-notice--warning': type === 'warning',
      'reka-notice--info': type === 'info',
      'reka-notice--success': type === 'success',
      'reka-notice--error': type === 'error',
      'reka-notice--bordered': bordered,
    }"
  >
    <Icon
      :icon="resolvedIcon"
      class="reka-notice__icon"
    />
    <div class="reka-notice__content">
      {{ content }}
    </div>
  </div>
</template>
