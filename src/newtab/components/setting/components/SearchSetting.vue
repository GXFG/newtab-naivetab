<template>
  <BaseComponentSetting cname="search">
    <template #header>
      <NFormItem :label="$t('search.searchEngine')">
        <NSelect v-model:value="localConfig.search.urlValue" :options="SEARCH_ENGINE_LIST" @update:value="onChangeSearch" />
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

<script setup lang="ts">
import { SEARCH_ENGINE_LIST, localConfig } from '@/logic'

const onChangeSearch = (value, option: SelectStringItem) => {
  localConfig.search.urlName = option.label
}
</script>
