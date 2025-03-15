<script setup lang="ts">
import { SEARCH_ENGINE_LIST } from '@/logic/const'
import { localConfig } from '@/logic/store'
import BaseComponentCardTitle from '@/newtab/components/form/BaseComponentCardTitle.vue'
import BaseComponentSetting from '@/newtab/components/form/BaseComponentSetting.vue'

const state = reactive({
  searchEngine: '',
})

watch(
  () => localConfig.search.urlName,
  () => {
    state.searchEngine = localConfig.search.urlName === 'custom' ? 'custom' : localConfig.search.urlValue
  },
  {
    immediate: true,
  },
)

const onChangeSearch = (value: string, option: SelectStringItem) => {
  if (value === 'custom') {
    localConfig.search.urlName = 'custom'
    return
  }
  localConfig.search.urlName = option.label
  localConfig.search.urlValue = value
}

const searchEngineList = computed(() => {
  return [
    {
      label: window.$t('common.custom'),
      value: 'custom',
      icon: '',
    },
    ...SEARCH_ENGINE_LIST,
  ]
})

const searchSelectRenderLabel = (option: typeof SEARCH_ENGINE_LIST[0]) => {
  return [
    h(
      'div',
      {
        style: {
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        },
      },
      [
        h(
          'div',
          {
            style: {
              marginRight: '10px',
              width: '15px',
              height: '15px',
            },
          },
          [
            h(
              'img',
              {
                style: {
                  width: '100%',
                  display: option.icon ? 'auto' : 'none',
                },
                src: option.icon,
              },
            ),
          ],
        ),
        h('span', {}, option.label),
      ],
    ),
  ]
}
</script>

<template>
  <BaseComponentCardTitle :title="$t('setting.search')" />

  <BaseComponentSetting
    cname="search"
    :width-range="[200, 1000]"
    :height-range="[25, 300]"
  >
    <template #header>
      <NFormItem :label="$t('search.searchEngine')">
        <NSelect
          v-model:value="state.searchEngine"
          :options="searchEngineList"
          :render-label="searchSelectRenderLabel"
          size="small"
          @update:value="onChangeSearch"
        />
      </NFormItem>
      <NFormItem
        v-if="localConfig.search.urlName === 'custom'"
        :label="$t('search.customEngine')"
      >
        <NInput
          v-model:value="localConfig.search.urlValue"
          type="text"
          size="small"
          placeholder="https://example/search?q={query}"
        />
      </NFormItem>
      <NFormItem :label="$t('search.placeholder')">
        <NInput
          v-model:value="localConfig.search.placeholder"
          type="text"
          size="small"
          :placeholder="localConfig.search.urlName"
        />
      </NFormItem>
      <NFormItem :label="$t('general.newTabOpen')">
        <NSwitch
          v-model:value="localConfig.search.isNewTabOpen"
          size="small"
        />
      </NFormItem>
      <NFormItem :label="$t('search.icon')">
        <NSwitch
          v-model:value="localConfig.search.iconEnabled"
          size="small"
        />
      </NFormItem>
      <NFormItem :label="$t('search.suggestion')">
        <NSwitch
          v-model:value="localConfig.search.suggestionEnabled"
          size="small"
        />
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>
