<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { localConfig } from '@/logic/store'
import { getBrowserBookmark } from '@/logic/bookmark'
import { requestPermission } from '@/logic/storage'
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
  SettingFormInlineRow,
} from '@/setting/components'
import BrowserBookmarkPicker from '@/components/BrowserBookmarkPicker.vue'
import { refreshSelectedFolderTitles } from '@/newtab/widgets/bookmarkFolder/logic'
import {
  NumberField,
  SwitchField,
  ColorField,
  FontField,
  ToggleColorField,
} from '@/setting/fields'

const state = reactive({
  showPicker: false,
  rootBookmarks: [] as BookmarkNode[],
})

const folderCrumb = computed(() => {
  const stack = localConfig.bookmarkFolder.selectedFolderTitles || []
  return stack.length === 0
    ? (window.$t('bookmarkFolder.rootDirectory') as string)
    : stack.join(' / ')
})

const findPathById = (root: BookmarkNode[], id: string): string[] => {
  for (const node of root) {
    if (node.id === id) return [node.title]
    if (node.children && node.children.length > 0) {
      const childPath = findPathById(node.children as BookmarkNode[], id)
      if (childPath.length > 0) return [node.title, ...childPath]
    }
  }
  return []
}

const ensureBookmarkRoot = async () => {
  if (state.rootBookmarks.length > 0) {
    return
  }
  const base = await getBrowserBookmark()
  state.rootBookmarks = base
}

const onOpenPicker = async () => {
  try {
    await ensureBookmarkRoot()
    state.showPicker = true
  } catch (e) {
    const granted = await requestPermission('bookmarks')
    if (granted) {
      await ensureBookmarkRoot()
      state.showPicker = true
    } else {
      window.$message.error(window.$t('browserPermission.bookmark') as string)
    }
  }
}

const onSelectBookmark = async (option: any) => {
  try {
    await ensureBookmarkRoot()
    const path = findPathById(state.rootBookmarks, option.id)
    localConfig.bookmarkFolder.selectedFolderTitles = path
    refreshSelectedFolderTitles()
  } catch (e) {
    console.warn('Select bookmark failed', e)
  }
}

const onResetFolder = () => {
  localConfig.bookmarkFolder.selectedFolderTitles = []
  refreshSelectedFolderTitles()
}
</script>

<template>
  <SettingHeaderBar :title="$t('setting.bookmarkFolder')" />

  <SettingFormWrap
    id="bookmarkFolder__setting"
    widget-code="bookmarkFolder"
  >
    <!-- 书签配置 -->
    <SettingFormSection
      :title="$t('bookmarkFolder.sectionBookmark')"
      :icon="ICONS.folderOutline"
    >
      <SettingFormItem :label="$t('bookmarkFolder.defaultDisplayFolderTitle')">
        <div class="folder__crumb">
          <Icon
            :icon="ICONS.folderOutline"
            class="crumb__icon"
          />
          <span class="crumb__text">{{ folderCrumb }}</span>
        </div>
        <NButton
          type="primary"
          size="tiny"
          secondary
          class="setting__btn setting__btn--primary"
          @click="onOpenPicker"
        >
          <Icon :icon="ICONS.bookmarkPlus" />&nbsp;{{ $t('common.select') }}
        </NButton>
        <NButton
          size="tiny"
          secondary
          round
          class="setting__btn setting__btn--default"
          @click="onResetFolder"
        >
          <Icon :icon="ICONS.restoreTwotone" />&nbsp;{{
            $t('generalSetting.resetSettingValue')
          }}
        </NButton>
      </SettingFormItem>

      <SettingFormItem :label="$t('bookmarkFolder.layoutColumns')">
        <NInputNumber
          v-model:value="localConfig.bookmarkFolder.gridColumns"
          class="setting__num-input"
          size="small"
          :step="1"
          :min="1"
          :max="50"
        />
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.bookmarkFolder.isNewTabOpen"
        :label="$t('generalSetting.newTabOpen')"
      />

      <SettingFormInlineRow>
        <SwitchField
          v-model="localConfig.bookmarkFolder.isIconVisible"
          :label="$t('bookmarkFolder.showIcon')"
        />

        <SwitchField
          v-model="localConfig.bookmarkFolder.isNameVisible"
          :label="$t('bookmarkFolder.showName')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 容器外观 -->
    <SettingFormSection
      :title="$t('bookmarkFolder.containerAppearance')"
      :icon="ICONS.palette"
    >
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.bookmarkFolder.padding"
          :label="$t('common.padding')"
          :min="0"
          :max="50"
          :step="1"
        />

        <NumberField
          v-model="localConfig.bookmarkFolder.borderRadius"
          :label="$t('common.borderRadius')"
          :min="0"
          :max="100"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.bookmarkFolder.width"
          :label="$t('common.width')"
          :min="1"
          :max="1000"
          :step="1"
        />

        <NumberField
          v-model="localConfig.bookmarkFolder.height"
          :label="$t('common.height')"
          :min="1"
          :max="1000"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.bookmarkFolder.backgroundColor"
          :label="$t('common.backgroundColor')"
        />

        <NumberField
          v-model="localConfig.bookmarkFolder.backgroundBlur"
          :label="$t('common.blur')"
          :min="0"
          :max="50"
          :step="0.1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <ToggleColorField
          v-model:enable="localConfig.bookmarkFolder.isBorderEnabled"
          v-model:color="localConfig.bookmarkFolder.borderColor"
          v-model:width="localConfig.bookmarkFolder.borderWidth"
          :label="$t('common.border')"
        />

        <ToggleColorField
          v-model:enable="localConfig.bookmarkFolder.isShadowEnabled"
          v-model:color="localConfig.bookmarkFolder.shadowColor"
          :label="$t('common.shadow')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 项目样式 -->
    <SettingFormSection
      :title="$t('bookmarkFolder.itemStyle')"
      :icon="ICONS.bookmarkPlus"
    >
      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.bookmarkFolder.iconSize"
          :label="$t('bookmarkFolder.iconSize')"
          :min="0"
          :max="100"
          :step="1"
        />

        <NumberField
          v-model="localConfig.bookmarkFolder.itemHeight"
          :label="$t('bookmarkFolder.itemHeight')"
          :min="1"
          :max="100"
          :step="1"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.bookmarkFolder.itemGap"
          :label="$t('bookmarkFolder.itemGap')"
          :min="0"
          :max="50"
          :step="0.1"
        />

        <NumberField
          v-model="localConfig.bookmarkFolder.itemBorderRadius"
          :label="$t('bookmarkFolder.itemBorderRadius')"
          :min="0"
          :max="50"
          :step="1"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 文字排版 -->
    <SettingFormSection section-key="common.typography">
      <FontField
        v-model:font-family="localConfig.bookmarkFolder.fontFamily"
        v-model:font-color="localConfig.bookmarkFolder.fontColor"
        v-model:font-size="localConfig.bookmarkFolder.fontSize"
        :label="$t('common.font')"
      />
    </SettingFormSection>
  </SettingFormWrap>

  <BrowserBookmarkPicker
    v-model:show="state.showPicker"
    select-type="folder"
    @select="onSelectBookmark"
  />
</template>

<style scoped>
.folder__crumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 25px;
  padding: 0 10px;
  border-radius: 6px;
  background-color: var(--gray-alpha-08);
}
.crumb__icon {
  font-size: 16px;
}
.crumb__text {
  font-size: 13px;
  user-select: text;
}
</style>
