<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'

const props = defineProps<{
  title?: string
  /** i18n key，传入时自动翻译标题 + 匹配默认图标 */
  sectionKey?: string
  /** 显式图标，优先级高于 sectionKey 自动映射 */
  icon?: string
  /** 提示内容（无链接，inline 展示） */
  tipContent?: string
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
      <p
        v-if="tipContent"
        class="section-tip"
      >
        <Icon
          :icon="ICONS.info"
          class="tip__icon"
        />
        <span class="tip__text">{{ tipContent }}</span>
      </p>
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

    .section-tip {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-3) var(--space-3);
      font-size: var(--text-xs);
      color: var(--n-text-color-3);
      line-height: 1.5;
      opacity: var(--opacity-muted);

      .tip__icon {
        flex-shrink: 0;
        font-size: 12px;
      }

      .tip__text {
        flex: 1;
        min-width: 0;
      }
    }
  }
}
</style>
