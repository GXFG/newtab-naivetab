<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { localConfig } from '@/logic/store'
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormItem,
  SettingFormInlineRow,
  SettingFormSection,
} from '@/setting/components'
import {
  NumberField,
  ColorField,
  FontField,
  ToggleColorField,
} from '@/setting/fields'
import { state } from '@/newtab/widgets/news/logic'

type NewsSourceItem = {
  label: string
  value: NewsSources
}

const allNewsSources = computed<NewsSourceItem[]>(() => [
  { label: window.$t('news.toutiao'), value: 'toutiao' },
  { label: window.$t('news.baidu'), value: 'baidu' },
  { label: window.$t('news.zhihu'), value: 'zhihu' },
  { label: window.$t('news.weibo'), value: 'weibo' },
  { label: window.$t('news.kr36'), value: 'kr36' },
  { label: window.$t('news.v2ex'), value: 'v2ex' },
])

const isSourceSelected = (value: string) =>
  (localConfig.news.sourceList as string[]).includes(value)

const toggleSource = (value: NewsSources) => {
  const list = localConfig.news.sourceList
  const idx = list.indexOf(value)
  if (idx === -1) {
    list.push(value)
  } else {
    list.splice(idx, 1)
  }
  state.currNewsTabValue = list[0] || 'baidu'
}

const moveUp = (value: string) => {
  const list = localConfig.news.sourceList as string[]
  const idx = list.indexOf(value)
  if (idx <= 0) return
  list.splice(idx - 1, 0, list.splice(idx, 1)[0])
}

const moveDown = (value: string) => {
  const list = localConfig.news.sourceList as string[]
  const idx = list.indexOf(value)
  if (idx === -1 || idx >= list.length - 1) return
  list.splice(idx + 1, 0, list.splice(idx, 1)[0])
}

const selectedSources = computed<NewsSourceItem[]>(
  () =>
    (localConfig.news.sourceList as string[])
      .map((v) => allNewsSources.value.find((s) => s.value === v))
      .filter(Boolean) as NewsSourceItem[],
)

const unselectedSources = computed<NewsSourceItem[]>(() =>
  allNewsSources.value.filter((s) => !isSourceSelected(s.value)),
)
</script>

<template>
  <SettingHeaderBar :title="$t('setting.news')" />

  <SettingFormWrap widget-code="news">
    <!-- 新闻源 -->
    <SettingFormSection
      :title="$t('news.newsSource')"
      :icon="ICONS.news"
    >
      <SettingFormItem
        :label="$t('news.source')"
        align-items="flex-start"
      >
        <div class="news-source-sorter">
          <div
            v-for="(item, index) in selectedSources"
            :key="item.value"
            class="sorter__item sorter__item--selected"
          >
            <NCheckbox
              :checked="true"
              size="small"
              @update:checked="toggleSource(item.value)"
            />
            <span class="item__label">{{ item.label }}</span>
            <div class="item__actions">
              <NButton
                quaternary
                size="tiny"
                :disabled="index === 0"
                @click="moveUp(item.value)"
              >
                <Icon
                  :icon="ICONS.newsArrowUp"
                  class="action__icon"
                />
              </NButton>
              <NButton
                quaternary
                size="tiny"
                :disabled="index === selectedSources.length - 1"
                @click="moveDown(item.value)"
              >
                <Icon
                  :icon="ICONS.newsArrowDown"
                  class="action__icon"
                />
              </NButton>
            </div>
          </div>

          <NDivider
            v-if="selectedSources.length > 0 && unselectedSources.length > 0"
            class="news-source-divider"
          />

          <div
            v-for="item in unselectedSources"
            :key="item.value"
            class="sorter__item sorter__item--unselected"
          >
            <NCheckbox
              :checked="false"
              size="small"
              @update:checked="toggleSource(item.value)"
            />
            <span class="item__label item__label--dimmed">{{
              item.label
            }}</span>
          </div>
        </div>
      </SettingFormItem>

      <SettingFormItem :label="$t('news.refreshInterval')">
        <NInputNumber
          v-model:value="localConfig.news.refreshIntervalTime"
          class="setting__num-input--unit"
          size="small"
          :step="1"
          :min="30"
          :max="1000"
        >
          <!-- min 为国际通用单位缩写，无需 i18n -->
          <template #suffix> min </template>
        </NInputNumber>
      </SettingFormItem>
    </SettingFormSection>

    <!-- 外观 -->
    <SettingFormSection section-key="common.appearance">
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.news.width"
          :label="$t('common.width')"
          :min="1"
          :max="1000"
          :step="1"
        />
        <NumberField
          v-model="localConfig.news.height"
          :label="$t('common.height')"
          :min="1"
          :max="1000"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.news.margin"
          :label="$t('common.margin')"
          :min="0"
          :max="50"
          :step="1"
        />
        <NumberField
          v-model="localConfig.news.borderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="100"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.news.backgroundColor"
          :label="$t('common.backgroundColor')"
        />

        <NumberField
          v-model="localConfig.news.backgroundBlur"
          :label="$t('common.blur')"
          :min="0"
          :max="50"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ToggleColorField
          v-model:enable="localConfig.news.isBorderEnabled"
          v-model:color="localConfig.news.borderColor"
          v-model:width="localConfig.news.borderWidth"
          :label="$t('common.border')"
        />

        <ToggleColorField
          v-model:enable="localConfig.news.isShadowEnabled"
          v-model:color="localConfig.news.shadowColor"
          :label="$t('common.shadow')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 文字与配色 -->
    <SettingFormSection
      :title="$t('news.typographyColor')"
      :icon="ICONS.text"
    >
      <FontField
        v-model:font-family="localConfig.news.fontFamily"
        v-model:font-color="localConfig.news.fontColor"
        v-model:font-size="localConfig.news.fontSize"
        :label="$t('common.font')"
      />

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.news.urlActiveColor"
          :label="$t('news.urlActiveColorLabel')"
        />
        <ColorField
          v-model="localConfig.news.tabActiveBackgroundColor"
          :label="$t('news.labelActiveColorLabel')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>
  </SettingFormWrap>
</template>

<style scoped>
.news-source-sorter {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sorter__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px;
  border-radius: 6px;
}

.sorter__item--unselected {
  opacity: 0.45;
}

.item__label {
  flex: 1;
  font-size: 13px;
}

.item__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  .action__icon {
    font-size: 20px;
  }
}

.news-source-divider {
  width: 100%;
  margin: 4px 0;
}
</style>
