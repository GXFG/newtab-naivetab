<script setup lang="ts">
import { globalState, localConfig } from '@/logic'

const newsSourceList = computed(() => [
  { label: window.$t('news.toutiao'), value: 'toutiao' },
  { label: window.$t('news.baidu'), value: 'baidu' },
  { label: window.$t('news.zhihu'), value: 'zhihu' },
  { label: window.$t('news.weibo'), value: 'weibo' },
  { label: window.$t('news.kr36'), value: 'kr36' },
  { label: window.$t('news.v2ex'), value: 'v2ex' },
  // { label: window.$t('news.bilibili'), value: 'bilibili' },
])

const handleUpdateValue = () => {
  globalState.currNewsTabValue = localConfig.news.sourceList[0] || ''
}
</script>

<template>
  <BaseComponentSetting cname="news" :widthRange="[200, 1000]" :heightRange="[50, 1000]">
    <template #header>
      <NFormItem :label="$t('news.source')">
        <NSelect
          v-model:value="localConfig.news.sourceList"
          placeholder=" "
          :options="newsSourceList"
          max-tag-count="responsive"
          multiple
          clearable
          @update:value="handleUpdateValue"
        />
      </NFormItem>
      <NFormItem :label="$t('news.refreshInterval')">
        <NInputNumber v-model:value="localConfig.news.refreshIntervalTime" class="setting__input-number--unit" :step="1" :min="30" :max="1000">
          <template #suffix>
            min
          </template>
        </NInputNumber>
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
