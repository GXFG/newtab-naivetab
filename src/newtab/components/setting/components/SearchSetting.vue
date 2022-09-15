<script setup lang="ts">
import { SEARCH_ENGINE_LIST, localConfig } from '@/logic'

const state = reactive({
  searchEngine: '',
})

watch(() => localConfig.search.urlName,
  () => {
    state.searchEngine = localConfig.search.urlName === 'custom' ? 'custom' : localConfig.search.urlValue
  }, {
    immediate: true,
  })

const searchEngineList = computed(() => [
  { label: window.$t('common.custom'), value: 'custom' },
  ...SEARCH_ENGINE_LIST,
])

const onChangeSearch = (value: string, option: SelectStringItem) => {
  if (value === 'custom') {
    localConfig.search.urlName = 'custom'
    return
  }
  localConfig.search.urlName = option.label
  localConfig.search.urlValue = value
}
</script>

<template>
  <BaseComponentSetting cname="search">
    <template #header>
      <NFormItem :label="$t('search.searchEngine')">
        <NSelect v-model:value="state.searchEngine" :options="searchEngineList" @update:value="onChangeSearch" />
      </NFormItem>
      <NFormItem v-if="localConfig.search.urlName === 'custom'" :label="$t('search.customEngine')">
        <NInput v-model:value="localConfig.search.urlValue" type="text" placeholder="https://example/search?q={query}" />
      </NFormItem>
      <NFormItem :label="$t('search.placeholder')">
        <NInput v-model:value="localConfig.search.placeholder" type="text" :placeholder="localConfig.search.urlName" />
      </NFormItem>
      <NFormItem :label="$t('search.icon')">
        <NSwitch v-model:value="localConfig.search.iconEnabled" />
      </NFormItem>
      <NFormItem :label="$t('search.suggestion')">
        <NSwitch v-model:value="localConfig.search.suggestionEnabled" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
