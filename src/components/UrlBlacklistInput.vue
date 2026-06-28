<script setup lang="ts">
/**
 * UrlBlacklistInput
 *
 * 折叠面板式域名黑名单输入组件，每行一个域名。
 * 标题由外层 SettingFormItem label 提供，组件内只负责折叠切换和内容区。
 */

import { normalizeDomain } from '@/logic/shortcut/utils'

const model = defineModel<string[]>({ default: () => [] })

const MAX_COUNT = 20
const MAX_LENGTH = 100

const collapsed = ref(true)
const placeholder = window.$t('generalSetting.urlBlacklistPlaceholder')

const parseLines = (text: string): string[] => {
  const cleaned = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      return line.length > MAX_LENGTH ? line.slice(0, MAX_LENGTH) : line
    })
    .map(normalizeDomain)
    .filter(Boolean)
  return [...new Set(cleaned)].slice(0, MAX_COUNT)
}

const inputText = ref(model.value.join('\n'))

watch(
  () => model.value,
  (val) => {
    inputText.value = val.join('\n')
  },
)

const handleBlur = () => {
  model.value = parseLines(inputText.value)
}
</script>

<template>
  <div class="url-blacklist">
    <div
      class="blacklist__toggle"
      @click="collapsed = !collapsed"
    >
      <span class="toggle__count">({{ model.length }}/{{ MAX_COUNT }})</span>
      <span
        class="toggle__arrow"
        :class="{ 'toggle__arrow--expanded': !collapsed }"
      >
        ▼
      </span>
    </div>

    <div
      class="blacklist__content"
      :class="{ 'blacklist__content--collapsed': collapsed }"
    >
      <div class="blacklist__content-inner">
        <NTInput
          v-model:value="inputText"
          type="textarea"
          :placeholder="placeholder"
          :rows="3"
          @blur="handleBlur"
        />

        <div
          v-if="model.length > 0"
          class="blacklist-preview"
        >
          <NTTag
            v-for="(domain, i) in model"
            :key="i"
            :bordered="false"
            closable
            @close="model = model.filter((_, idx) => idx !== i)"
          >
            {{ domain }}
          </NTTag>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.url-blacklist {
  display: flex;
  flex-direction: column;
  flex: 1;
  align-self: flex-start;
  padding-top: 3px;
  min-width: 0;
}

.blacklist__toggle {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
}

.toggle__count {
  font-size: 12px;
  color: var(--nt-text-primary);
  opacity: 0.6;
}

.toggle__arrow {
  font-size: 10px;
  line-height: 1;
  color: var(--nt-text-primary);
  opacity: 0.5;
  transition: transform 0.2s ease;
}

.toggle__arrow--expanded {
  transform: rotate(180deg);
}

.blacklist__content {
  overflow: hidden;
  margin-top: 8px;
  max-height: 400px;
  opacity: 1;
  transition:
    max-height 0.3s ease,
    opacity 0.2s ease,
    margin 0.3s ease;
}

.blacklist__content--collapsed {
  max-height: 0;
  opacity: 0;
}

.blacklist__content-inner {
  padding: 0 0 12px;
}

.blacklist-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
</style>
