<template>
  <BaseComponentSetting cname="search">
    <template #header>
      <NFormItem :label="$t('search.searchEngine')">
        <NSelect v-model:value="globalState.setting.search.urlValue" :options="SEARCH_ENGINE_LIST" @update:value="onChangeSearch" />
      </NFormItem>
      <NFormItem :label="$t('search.placeholder')">
        <NInput v-model:value="globalState.setting.search.placeholder" type="text" placeholder=" " />
      </NFormItem>
      <NFormItem :label="$t('search.icon')">
        <NSwitch v-model:value="globalState.setting.search.iconEnabled" />
      </NFormItem>
      <NFormItem :label="$t('search.suggestion')">
        <NSwitch v-model:value="globalState.setting.search.suggestionEnabled" />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { SEARCH_ENGINE_LIST, globalState } from '@/logic'

const onChangeSearch = (value, option: SelectStringItem) => {
  globalState.setting.search.urlName = option.label
}
</script>
