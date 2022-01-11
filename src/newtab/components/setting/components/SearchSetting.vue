<template>
  <BaseComponentSetting field="search">
    <template #header>
      <NFormItem :label="$t('search.searchEngine')">
        <NSelect v-model:value="globalState.setting.search.urlValue" :options="SEARCH_ENGINE_LIST" @update:value="onChangeSearch" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { SEARCH_ENGINE_LIST, globalState } from '@/logic'

const onChangeSearch = (value, option: TSelectStringItem) => {
  globalState.setting.search.urlName = option.label
}
</script>
