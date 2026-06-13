<script setup lang="ts">
import NTInputNumber from '@/components/ui/NTInputNumber.vue'
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { localConfig } from '@/logic/config/state'
import {
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

/** 同步当前 tab 为列表第一个源，列表空时回退到 baidu */
function syncCurrTab() {
  state.currNewsTabValue = localConfig.news.sourceList[0] || 'baidu'
}

const toggleSource = (value: NewsSources) => {
  const list = localConfig.news.sourceList
  const idx = list.indexOf(value)
  if (idx === -1) {
    list.push(value)
  } else {
    list.splice(idx, 1)
  }
  syncCurrTab()
}

const moveUp = (value: NewsSources) => {
  const list = localConfig.news.sourceList
  const idx = list.indexOf(value)
  if (idx <= 0) return
  list.splice(idx - 1, 0, list.splice(idx, 1)[0])
  syncCurrTab()
}

const moveDown = (value: NewsSources) => {
  const list = localConfig.news.sourceList
  const idx = list.indexOf(value)
  if (idx === -1 || idx >= list.length - 1) return
  list.splice(idx + 1, 0, list.splice(idx, 1)[0])
  syncCurrTab()
}

/** 单一选择列表：已选源在前（sourceList顺序），未选源在后（默认顺序） */
const allSourcesOrdered = computed(() => {
  const sourceList = localConfig.news.sourceList as string[]
  const selected = sourceList
    .map((v, i) => {
      const item = allNewsSources.value.find((s) => s.value === v)
      return item
        ? { ...item, selected: true as const, selectedIndex: i }
        : null
    })
    .filter(Boolean)
  const unselected = allNewsSources.value
    .filter((s) => !sourceList.includes(s.value))
    .map((s) => ({ ...s, selected: false as const, selectedIndex: -1 }))
  return [...selected, ...unselected] as Array<
    NewsSourceItem & { selected: boolean; selectedIndex: number }
  >
})
</script>

<template>
  <SettingFormWrap widget-code="news">
    <!-- 新闻源 -->
    <SettingFormSection
      :title="$t('news.newsSource')"
      :icon="ICONS.news"
    >
      <SettingFormItem
        :label="$t('news.currentSource')"
        align-items="flex-start"
      >
        <div class="news-source-sorter">
          <div
            v-for="item in allSourcesOrdered"
            :key="item.value"
            class="sorter__item"
            :class="{ 'sorter__item--unselected': !item.selected }"
          >
            <NTCheckbox
              :value="item.selected"
              @update:value="toggleSource(item.value)"
            />
            <span class="item__label">{{ item.label }}</span>
            <div
              v-if="item.selected"
              class="item__actions"
            >
              <NTButton
                variant="ghost"
                size="tiny"
                :disabled="item.selectedIndex === 0"
                @click="moveUp(item.value)"
              >
                <Icon
                  :icon="ICONS.newsArrowUp"
                  class="action__icon"
                />
              </NTButton>
              <NTButton
                variant="ghost"
                size="tiny"
                :disabled="
                  item.selectedIndex === localConfig.news.sourceList.length - 1
                "
                @click="moveDown(item.value)"
              >
                <Icon
                  :icon="ICONS.newsArrowDown"
                  class="action__icon"
                />
              </NTButton>
            </div>
          </div>
        </div>
      </SettingFormItem>

      <SettingFormItem :label="$t('news.refreshInterval')">
        <NTInputNumber
          v-model:value="localConfig.news.refreshIntervalTime"
          class="setting__num-input--unit"
          size="small"
          :step="1"
          :min="30"
          :max="1000"
        >
          <!-- min 为国际通用单位缩写，无需 i18n -->
          <template #suffix> min </template>
        </NTInputNumber>
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
  height: 32px;
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
</style>
