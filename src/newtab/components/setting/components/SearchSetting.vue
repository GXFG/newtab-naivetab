<template>
  <ElementLayout field="search">
    <NFormItem :label="$t('search.searchEngine')">
      <NSelect v-model:value="globalState.setting.search.urlValue" :options="SEARCH_ENGINE_LIST" @update:value="onChangeSearch" />
    </NFormItem>
  </ElementLayout>

  <ElementConfig field="search" />
</template>

<script setup lang="ts">
import { NFormItem, NSelect } from 'naive-ui'
import { SEARCH_ENGINE_LIST, globalState } from '@/logic'

const onChangeSearch = (value, option: TSelectItem) => {
  globalState.setting.search.urlName = option.label
}
</script>
