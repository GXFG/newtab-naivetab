<template>
  <BaseComponentSetting cname="news">
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
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { globalState, localConfig } from '@/logic'

const newsSourceList = computed(() => [
  { label: window.$t('news.weibo'), value: 'weibo' },
  { label: window.$t('news.zhihu'), value: 'zhihu' },
  { label: window.$t('news.baidu'), value: 'baidu' },
  { label: window.$t('news.v2ex'), value: 'v2ex' },
])

const handleUpdateValue = () => {
  globalState.currNewsTabValue = localConfig.news.sourceList[0] || ''
}
</script>
