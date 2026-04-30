<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'

const props = defineProps<{
  title?: string
  /** i18n key，传入时自动翻译标题 + 匹配默认图标 */
  sectionKey?: string
  /** 显式图标，优先级高于 sectionKey 自动映射 */
  icon?: string
}>()

const { t } = useI18n()

const SECTION_ICON_MAP: Record<string, string> = {
  'common.behavior': ICONS.tune,
  'common.appearance': ICONS.palette,
  'common.typography': ICONS.text,
  'common.size': ICONS.resize,
}

const resolvedIcon = computed(
  () =>
    props.icon ??
    (props.sectionKey ? SECTION_ICON_MAP[props.sectionKey] : undefined),
)
const resolvedTitle = computed(
  () => props.title ?? (props.sectionKey ? t(props.sectionKey) : ''),
)
</script>

<template>
  <div class="setting-form-section">
    <div
      v-if="title || sectionKey"
      class="section__header"
    >
      <Icon
        v-if="resolvedIcon"
        :icon="resolvedIcon"
        class="header__icon"
      />
      {{ resolvedTitle }}
    </div>
    <div class="section__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.setting-form-section {
  margin-bottom: 35px;

  .section__header {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--n-text-color-3);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding-bottom: 8px;
    display: flex;
    align-items: center;
    gap: var(--space-1);

    .header__icon {
      font-size: 14px;
      flex-shrink: 0;
    }
  }

  .section__body {
    border: 1px solid var(--gray-alpha-08);
    border-radius: var(--radius-lg);
    overflow: hidden;

    /* 最后一项不显示分隔线，容器边框已兜底 */
    :deep(.setting-form-item-wrap:last-child .form-item),
    :deep(.setting-form-item-wrap:last-child .tip-inline) {
      border-bottom: none;
    }
  }
}
</style>
