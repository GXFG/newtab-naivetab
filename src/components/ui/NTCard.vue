<script setup lang="ts">
/**
 * NTCard — NaiveTab 卡片容器组件
 *
 * 纯 CSS 卡片，无 Reka 交互。
 * #header-extra 插槽用于头部右侧额外内容。
 * 样式由 src/styles/reka/card.css 控制。
 *
 * @example
 * <NTCard title="标题">内容</NTCard>
 * <NTCard title="标题">
 *   <template #header-extra><NButton>操作</NButton></template>
 *   内容
 * </NTCard>
 */
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="reka-card">
    <div
      v-if="title || $slots.header"
      class="reka-card__header"
    >
      <slot name="header">
        <span class="reka-card__title">{{ title }}</span>
      </slot>

      <div
        v-if="$slots['header-extra']"
        class="reka-card__header-extra"
      >
        <slot name="header-extra" />
      </div>
    </div>

    <div class="reka-card__body">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="reka-card__footer"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
