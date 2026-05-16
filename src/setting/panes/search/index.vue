<script setup lang="ts">
import { SEARCH_ENGINE_LIST } from '@/logic/constants/search'
import { localConfig } from '@/logic/config/state'
import { ICONS } from '@/logic/constants/icons'
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
  SettingFormInlineRow,
} from '@/setting/components'
import {
  NumberField,
  SwitchField,
  FontField,
  ToggleColorField,
  ColorField,
} from '@/setting/fields'

const state = reactive({
  searchEngine: '',
})

watch(
  () => localConfig.search.urlName,
  () => {
    state.searchEngine =
      localConfig.search.urlName === 'custom'
        ? 'custom'
        : localConfig.search.urlValue
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
      faviconUrl: '',
    },
    ...SEARCH_ENGINE_LIST,
  ] as Array<{ label: string; value: string; faviconUrl: string }>
})

const searchSelectRenderLabel = (option: {
  label: string
  value: string
  faviconUrl?: string
}) => {
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
        option.faviconUrl
          ? h('img', {
              style: {
                marginRight: '10px',
                width: '15px',
                height: '15px',
              },
              src: option.faviconUrl,
            })
          : h('div', { style: { marginRight: '10px', width: '15px' } }),
        h('span', {}, option.label),
      ],
    ),
  ]
}
</script>

<template>
  <SettingHeaderBar :title="$t('setting.search')" />

  <SettingFormWrap widget-code="search">
    <!-- 搜索引擎 -->
    <SettingFormSection
      :title="$t('search.searchBar')"
      :icon="ICONS.searchAction"
    >
      <SettingFormItem :label="$t('search.searchEngine')">
        <NSelect
          v-model:value="state.searchEngine"
          :options="searchEngineList"
          :render-label="searchSelectRenderLabel"
          size="small"
          @update:value="onChangeSearch"
        />
      </SettingFormItem>

      <Transition name="setting-slide">
        <SettingFormItem
          v-if="localConfig.search.urlName === 'custom'"
          :label="$t('search.customEngine')"
        >
          <!-- 自定义搜索引擎 URL 示例，无需 i18n -->
          <NInput
            v-model:value="localConfig.search.urlValue"
            type="text"
            size="small"
            placeholder="https://example/search?q={query}"
          />
        </SettingFormItem>
      </Transition>

      <SettingFormItem :label="$t('search.placeholder')">
        <NInput
          v-model:value="localConfig.search.placeholder"
          type="text"
          size="small"
          :placeholder="localConfig.search.urlName"
        />
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.search.isNewTabOpen"
        :label="$t('generalSetting.newTabOpen')"
      />

      <SettingFormInlineRow>
        <SwitchField
          v-model="localConfig.search.iconEnabled"
          :label="$t('search.icon')"
        />

        <SwitchField
          v-model="localConfig.search.suggestionEnabled"
          :label="$t('search.suggestion')"
        />
      </SettingFormInlineRow>

      <SwitchField
        v-model="localConfig.search.isSearchEngineIconVisible"
        :label="$t('search.searchEngineIcon')"
      >
        <template #extra>
          <NInput
            v-model:value="localConfig.search.searchEngineIconUrl"
            size="small"
            :placeholder="$t('search.searchEngineIconUrlPlaceholder')"
          />
        </template>
      </SwitchField>
    </SettingFormSection>

    <!-- 搜索栏外观 -->
    <SettingFormSection
      :title="$t('search.searchBarStyle')"
      :icon="ICONS.preview"
    >
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.search.width"
          :label="$t('common.width')"
          :min="1"
          :max="1000"
          :step="1"
        />

        <NumberField
          v-model="localConfig.search.height"
          :label="$t('common.height')"
          :min="1"
          :max="500"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.search.padding"
          :label="$t('common.padding')"
          :min="0"
          :max="100"
          :step="0.1"
        />

        <NumberField
          v-model="localConfig.search.borderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="100"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.search.backgroundColor"
          :label="$t('common.backgroundColor')"
        />

        <NumberField
          v-model="localConfig.search.backgroundBlur"
          :label="$t('common.blur')"
          :min="0"
          :max="30"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ToggleColorField
          v-model:enable="localConfig.search.isBorderEnabled"
          v-model:color="localConfig.search.borderColor"
          v-model:width="localConfig.search.borderWidth"
          :label="$t('common.border')"
        />

        <ToggleColorField
          v-model:enable="localConfig.search.isShadowEnabled"
          v-model:color="localConfig.search.shadowColor"
          :label="$t('common.shadow')"
        />
      </SettingFormInlineRow>

      <FontField
        v-model:font-family="localConfig.search.fontFamily"
        v-model:font-color="localConfig.search.fontColor"
        v-model:font-size="localConfig.search.fontSize"
        :label="$t('common.font')"
      />
    </SettingFormSection>

    <!-- 建议列表 -->
    <SettingFormSection
      :title="$t('search.suggestion')"
      :icon="ICONS.info"
    >
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.search.dropdownMaxItems"
          :label="$t('common.maxItems')"
          :min="2"
          :max="15"
          :step="1"
        />

        <NumberField
          v-model="localConfig.search.dropdownBorderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="100"
          :step="1"
        />
      </SettingFormInlineRow>

      <ColorField
        v-model="localConfig.search.dropdownBackgroundColor"
        :label="$t('common.backgroundColor')"
      />

      <FontField
        v-model:font-family="localConfig.search.dropdownFontFamily"
        v-model:font-color="localConfig.search.dropdownFontColor"
        v-model:font-size="localConfig.search.dropdownFontSize"
        :label="$t('common.font')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
